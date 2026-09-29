"use client";

import { useActionState } from "react";
import { signInAction, type SignInState } from "@/server/actions/auth-actions";
import { FormField, inputClassName } from "./form-field";
import { StatusMessage } from "./status-message";
import { Button } from "./ui/button";

const initialState: SignInState = { message: null };

/**
 * パスワードでのログイン。運営・保護者・コーチはメールアドレス、生徒は ippo- から始まるログインID。
 * どちらも同じ欄に入れられるようにして、子どもが入口を迷わないようにする。
 */
export function PasswordLoginForm({ next }: { next: string | null }) {
  const [state, formAction, pending] = useActionState(signInAction, initialState);
  return (
    <form action={formAction} noValidate className="space-y-4" data-testid="login-form">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <FormField id="loginId" label="メールアドレス または ログインID" hint="生徒は「ippo-」から始まるログインIDを入れてね">
        {/* まちがえてもログインIDは消さない（送信のたびに React がフォームを空に戻すので、返ってきた値を初期値にする） */}
        <input id="loginId" name="loginId" key={state.loginId ?? ""} defaultValue={state.loginId ?? ""} autoComplete="username" autoCapitalize="none" inputMode="email" className={inputClassName} aria-describedby="loginId-hint" required />
      </FormField>
      <FormField id="password" label="パスワード">
        <input id="password" name="password" type="password" autoComplete="current-password" className={inputClassName} required />
      </FormField>
      {state.message ? <StatusMessage tone="error" testId="login-error">{state.message}</StatusMessage> : null}
      <Button type="submit" size="lg" className="w-full" disabled={pending} data-busy={pending ? "true" : undefined} data-testid="login-submit">
        ログイン
      </Button>
    </form>
  );
}
