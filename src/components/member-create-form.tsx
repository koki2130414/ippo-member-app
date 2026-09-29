"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { memberCreateFormSchema, type MemberCreateFormInput, type MemberCreateFormOutput } from "@/domain/schemas";
import { createMemberAction } from "@/server/actions/admin-actions";
import { StatusMessage } from "./status-message";
import { Button } from "./ui/button";

/**
 * 会員を追加するフォーム（React Hook Form ＋ サーバーと同じ Zod スキーマ）。
 * エラーはブラウザ標準の吹き出しではなく DOM のテキストで出す（noValidate。仕様 10.6）。
 */

const inputClass = "mt-1 block h-11 w-full rounded-lg border border-input bg-background px-3 text-base";

export function MemberCreateForm({ plans }: { plans: { code: string; name: string }[] }) {
  const router = useRouter();
  const [serverMessage, setServerMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<MemberCreateFormInput, unknown, MemberCreateFormOutput>({
    resolver: zodResolver(memberCreateFormSchema),
    defaultValues: { displayName: "", fullName: "", email: "", role: "student", planCode: "", ageBand: "" },
  });
  // プランは生徒のときだけ選べる。useWatch は React Compiler と両立する購読のしかた
  const role = useWatch({ control, name: "role" });

  async function onSubmit(values: MemberCreateFormOutput) {
    setServerMessage(null);
    const result = await createMemberAction(values);
    if (!result.ok) {
      setServerMessage({ tone: "error", text: result.message });
      return;
    }
    reset();
    setServerMessage({ tone: "success", text: "追加しました" });
    router.refresh();
  }

  const fieldError = (message: string | undefined, id: string) =>
    message ? (
      <p id={id} className="mt-1 text-sm text-destructive">
        {message}
      </p>
    ) : null;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4" data-testid="admin-user-form" data-state={isSubmitting ? "loading" : "ready"}>
      <div>
        <label htmlFor="displayName" className="text-sm font-semibold">表示名（ほかの会員に見える名前）</label>
        <input id="displayName" className={inputClass} aria-invalid={errors.displayName ? true : undefined} aria-describedby="displayName-hint displayName-error" {...register("displayName")} />
        <p id="displayName-hint" className="mt-1 text-xs text-muted-foreground">本名は入れず、ニックネームにしてください</p>
        {fieldError(errors.displayName?.message, "displayName-error")}
      </div>
      <div>
        <label htmlFor="fullName" className="text-sm font-semibold">お名前（運営だけが見ます）</label>
        <input id="fullName" className={inputClass} aria-invalid={errors.fullName ? true : undefined} aria-describedby="fullName-error" {...register("fullName")} />
        {fieldError(errors.fullName?.message, "fullName-error")}
      </div>
      <div>
        <label htmlFor="email" className="text-sm font-semibold">メールアドレス</label>
        <input id="email" type="email" autoComplete="off" className={inputClass} aria-invalid={errors.email ? true : undefined} aria-describedby="email-error" {...register("email")} />
        {fieldError(errors.email?.message, "email-error")}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="role" className="text-sm font-semibold">ロール</label>
          <select id="role" className={inputClass} aria-describedby="role-error" {...register("role")}>
            <option value="student">生徒</option>
            <option value="guardian">保護者</option>
            <option value="coach">コーチ</option>
            <option value="admin">運営</option>
          </select>
          {fieldError(errors.role?.message, "role-error")}
        </div>
        <div>
          <label htmlFor="planCode" className="text-sm font-semibold">プラン</label>
          <select id="planCode" className={inputClass} aria-describedby="planCode-error" disabled={role !== "student"} {...register("planCode")}>
            <option value="">なし</option>
            {plans.map((plan) => (
              <option key={plan.code} value={plan.code}>{plan.name}</option>
            ))}
          </select>
          {fieldError(errors.planCode?.message, "planCode-error")}
        </div>
        <div>
          <label htmlFor="ageBand" className="text-sm font-semibold">年代</label>
          <select id="ageBand" className={inputClass} {...register("ageBand")}>
            <option value="">指定しない</option>
            <option value="elementary_lower">小学校低学年</option>
            <option value="elementary_upper">小学校高学年</option>
            <option value="junior_high">中学生</option>
            <option value="adult">大人</option>
          </select>
        </div>
      </div>

      {serverMessage ? <StatusMessage tone={serverMessage.tone} testId="admin-user-form-result">{serverMessage.text}</StatusMessage> : null}

      <Button type="submit" disabled={isSubmitting} data-busy={isSubmitting ? "true" : undefined} data-testid="admin-user-submit" className="w-full sm:w-auto">
        この内容で会員を追加する
      </Button>
    </form>
  );
}
