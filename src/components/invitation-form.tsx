"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { accountSetupSchema, invitationAcceptSchema, type AccountSetupInput, type InvitationAcceptInput } from "@/domain/schemas";
import { acceptInvitationAction } from "@/server/actions/auth-actions";
import { FormField, describedBy, inputClassName } from "./form-field";
import { StatusMessage } from "./status-message";
import { buttonVariants } from "./ui/button";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

type Done = { loginIds: { label: string; loginId: string }[]; homePath: string };

/** パスワードを決めたあとの画面。生徒のログインIDはここで初めて伝わるので、目立たせる */
function Completed({ done }: { done: Done }) {
  return (
    <div className="space-y-4" data-testid="invite-done">
      <StatusMessage tone="success" testId="invite-result">パスワードを決めました</StatusMessage>
      <Card className="space-y-3">
        <p className="text-sm font-semibold">次からは、このログインIDとパスワードでログインします。メモしておいてください。</p>
        <dl className="space-y-2">
          {done.loginIds.map((item) => (
            <div key={item.label}>
              <dt className="text-xs text-muted-foreground">{item.label}</dt>
              <dd className="font-mono text-lg font-bold" data-testid="invite-login-id">{item.loginId}</dd>
            </div>
          ))}
        </dl>
      </Card>
      <Link href={done.homePath} className={`${buttonVariants({ size: "lg" })} w-full`} data-testid="invite-go-home">はじめる</Link>
    </div>
  );
}

export function FamilyInvitationForm({ token, studentDisplayName, onDone }: { token: string; studentDisplayName: string; onDone: (done: Done) => void }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<InvitationAcceptInput>({
    resolver: zodResolver(invitationAcceptSchema),
    defaultValues: { token, guardianPassword: "", guardianPasswordConfirm: "", studentPassword: "", studentPasswordConfirm: "" },
  });

  async function onSubmit(values: InvitationAcceptInput) {
    setServerError(null);
    const result = await acceptInvitationAction("family", values);
    if (!result.ok) return setServerError(result.message);
    onDone(result.data);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5" data-testid="invite-form">
      <fieldset className="space-y-3">
        <legend className="font-bold">保護者のパスワード</legend>
        <FormField id="guardianPassword" label="パスワード（8文字以上）" error={errors.guardianPassword?.message}>
          <input id="guardianPassword" type="password" autoComplete="new-password" className={inputClassName} {...describedBy("guardianPassword", false, errors.guardianPassword?.message)} {...register("guardianPassword")} />
        </FormField>
        <FormField id="guardianPasswordConfirm" label="パスワード（確認）" error={errors.guardianPasswordConfirm?.message}>
          <input id="guardianPasswordConfirm" type="password" autoComplete="new-password" className={inputClassName} {...describedBy("guardianPasswordConfirm", false, errors.guardianPasswordConfirm?.message)} {...register("guardianPasswordConfirm")} />
        </FormField>
      </fieldset>
      <fieldset className="space-y-3">
        <legend className="font-bold">{studentDisplayName}さんのパスワード</legend>
        <p className="text-xs text-muted-foreground">お子さまが自分でログインするときに使います。保護者とはちがうパスワードにしてください。</p>
        <FormField id="studentPassword" label="パスワード（8文字以上）" error={errors.studentPassword?.message}>
          <input id="studentPassword" type="password" autoComplete="new-password" className={inputClassName} {...describedBy("studentPassword", false, errors.studentPassword?.message)} {...register("studentPassword")} />
        </FormField>
        <FormField id="studentPasswordConfirm" label="パスワード（確認）" error={errors.studentPasswordConfirm?.message}>
          <input id="studentPasswordConfirm" type="password" autoComplete="new-password" className={inputClassName} {...describedBy("studentPasswordConfirm", false, errors.studentPasswordConfirm?.message)} {...register("studentPasswordConfirm")} />
        </FormField>
      </fieldset>
      {serverError ? <StatusMessage tone="error" testId="invite-error">{serverError}</StatusMessage> : null}
      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting} data-busy={isSubmitting ? "true" : undefined} data-testid="invite-submit">パスワードを決める</Button>
    </form>
  );
}

export function AccountInvitationForm({ token, onDone }: { token: string; onDone: (done: Done) => void }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<AccountSetupInput>({
    resolver: zodResolver(accountSetupSchema),
    defaultValues: { token, password: "", passwordConfirm: "" },
  });

  async function onSubmit(values: AccountSetupInput) {
    setServerError(null);
    const result = await acceptInvitationAction("account", values);
    if (!result.ok) return setServerError(result.message);
    onDone(result.data);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4" data-testid="invite-form">
      <FormField id="password" label="パスワード（8文字以上）" error={errors.password?.message}>
        <input id="password" type="password" autoComplete="new-password" className={inputClassName} {...describedBy("password", false, errors.password?.message)} {...register("password")} />
      </FormField>
      <FormField id="passwordConfirm" label="パスワード（確認）" error={errors.passwordConfirm?.message}>
        <input id="passwordConfirm" type="password" autoComplete="new-password" className={inputClassName} {...describedBy("passwordConfirm", false, errors.passwordConfirm?.message)} {...register("passwordConfirm")} />
      </FormField>
      {serverError ? <StatusMessage tone="error" testId="invite-error">{serverError}</StatusMessage> : null}
      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting} data-busy={isSubmitting ? "true" : undefined} data-testid="invite-submit">パスワードを決める</Button>
    </form>
  );
}

export type InvitationPanelLookup =
  | { ok: true; purpose: "family_setup" | "account_setup"; guardianLabel: string | null; studentDisplayName: string | null; accountDisplayName: string | null }
  | { ok: false; message: string };

/**
 * 招待の画面全体。パスワードを決めた瞬間にログインのクッキーが付き、Next.js がこのページをサーバーで描き直す。
 * そのときリンクはもう「使用済み」なので、ページ側に任せると完了画面（ログインIDの表示）が消えてしまう。
 * そこで完了したかどうかをこの部品が持ち、描き直されても完了画面を出し続ける。
 */
export function InvitationPanel({ token, lookup }: { token: string; lookup: InvitationPanelLookup }) {
  const [done, setDone] = useState<Done | null>(null);
  if (done) return <Completed done={done} />;
  if (!lookup.ok) {
    return (
      <div className="space-y-3">
        <StatusMessage tone="error" testId="invite-unusable">{lookup.message}</StatusMessage>
        <Link href="/login" className="text-sm font-semibold text-link underline">ログイン画面へ</Link>
      </div>
    );
  }
  if (lookup.purpose === "family_setup") {
    return (
      <Card className="space-y-4">
        <p className="text-sm">
          IPPO へようこそ。{lookup.guardianLabel ? <>保護者（{lookup.guardianLabel}）と</> : null}
          {lookup.studentDisplayName}さんの、ログイン用のパスワードを決めてください。
        </p>
        <FamilyInvitationForm token={token} studentDisplayName={lookup.studentDisplayName ?? "お子さま"} onDone={setDone} />
      </Card>
    );
  }
  return (
    <Card className="space-y-4">
      <p className="text-sm">{lookup.accountDisplayName}さんの、ログイン用のパスワードを決めてください。</p>
      <AccountInvitationForm token={token} onDone={setDone} />
    </Card>
  );
}
