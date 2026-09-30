"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { GRADE_LABELS } from "@/domain/registration";
import { registrationApplicationSchema, type RegistrationApplicationInput, type RegistrationApplicationOutput } from "@/domain/schemas";
import { GRADES, PREFECTURES } from "@/domain/types";
import { submitApplicationAction } from "@/server/actions/registration-actions";
import { FormField, describedBy, inputClassName } from "./form-field";
import { StatusMessage } from "./status-message";
import { Button } from "./ui/button";

/**
 * 入会の申し込み（保護者が入力する）。集めるのは運営が決めた項目だけ。
 * ボット対策の見えない欄（website）は、人には見えず、読み上げでも飛ばされるようにしている。
 */
export function RegistrationForm() {
  const [received, setReceived] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegistrationApplicationInput, unknown, RegistrationApplicationOutput>({
    resolver: zodResolver(registrationApplicationSchema),
    defaultValues: { guardianEmail: "", childFullName: "", childDisplayName: "", website: "" },
  });

  async function onSubmit(values: RegistrationApplicationOutput) {
    setServerError(null);
    const result = await submitApplicationAction(values);
    if (!result.ok) return setServerError(result.message);
    setReceived(true);
  }

  if (received) {
    return (
      <div className="space-y-3" data-testid="register-done">
        <StatusMessage tone="success" testId="register-result">申し込みを受け付けました</StatusMessage>
        <p className="text-sm">運営が内容を確認し、ご入力のメールアドレスあてにご連絡します。ログイン用のリンクは、承認のあとにお送りします。</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4" data-testid="register-form">
      <FormField id="childFullName" label="お子さまのお名前" hint="運営だけが見ます。ほかの会員には表示されません" error={errors.childFullName?.message}>
        <input id="childFullName" autoComplete="off" className={inputClassName} {...describedBy("childFullName", true, errors.childFullName?.message)} {...register("childFullName")} />
      </FormField>
      <FormField id="childDisplayName" label="アプリで表示する名前（ニックネーム）" hint="ほかの会員やコーチに見える名前です。本名ではなくニックネームにしてください" error={errors.childDisplayName?.message}>
        <input id="childDisplayName" autoComplete="off" className={inputClassName} {...describedBy("childDisplayName", true, errors.childDisplayName?.message)} {...register("childDisplayName")} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="grade" label="学年" error={errors.grade?.message}>
          <select id="grade" className={inputClassName} defaultValue="" {...describedBy("grade", false, errors.grade?.message)} {...register("grade")}>
            <option value="" disabled>えらんでください</option>
            {GRADES.map((grade) => <option key={grade} value={grade}>{GRADE_LABELS[grade]}</option>)}
          </select>
        </FormField>
        <FormField id="prefecture" label="出身地（都道府県）" error={errors.prefecture?.message}>
          <select id="prefecture" className={inputClassName} defaultValue="" {...describedBy("prefecture", false, errors.prefecture?.message)} {...register("prefecture")}>
            <option value="" disabled>えらんでください</option>
            {PREFECTURES.map((prefecture) => <option key={prefecture} value={prefecture}>{prefecture}</option>)}
          </select>
        </FormField>
      </div>
      <FormField id="guardianEmail" label="保護者のメールアドレス" hint="運営からの連絡と、保護者のログインに使います" error={errors.guardianEmail?.message}>
        <input id="guardianEmail" type="email" autoComplete="email" className={inputClassName} {...describedBy("guardianEmail", true, errors.guardianEmail?.message)} {...register("guardianEmail")} />
      </FormField>

      <div className="sr-only" aria-hidden="true">
        <label htmlFor="website">この欄は空のままにしてください</label>
        <input id="website" tabIndex={-1} autoComplete="off" {...register("website")} />
      </div>

      <div>
        <div className="flex items-start gap-2">
          <input id="consent" type="checkbox" className="mt-1 h-5 w-5 accent-primary" {...describedBy("consent", false, errors.consent?.message)} {...register("consent")} />
          <label htmlFor="consent" className="text-sm">
            保護者として申し込みます。
            <Link href="/privacy" className="font-semibold text-link underline" target="_blank">個人情報の取り扱い</Link>
            を読み、同意します。
          </label>
        </div>
        {errors.consent?.message ? <p id="consent-error" className="mt-1 text-sm text-destructive">{errors.consent.message}</p> : null}
      </div>

      {serverError ? <StatusMessage tone="error" testId="register-error">{serverError}</StatusMessage> : null}
      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting} data-busy={isSubmitting ? "true" : undefined} data-testid="register-submit">
        この内容で申し込む
      </Button>
    </form>
  );
}
