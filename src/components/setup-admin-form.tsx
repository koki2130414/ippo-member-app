"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { setupAdminSchema, type SetupAdminInput } from "@/domain/schemas";
import { setupFirstAdminAction } from "@/server/actions/auth-actions";
import { FormField, describedBy, inputClassName } from "./form-field";
import { StatusMessage } from "./status-message";
import { Button } from "./ui/button";

export function SetupAdminForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SetupAdminInput>({
    resolver: zodResolver(setupAdminSchema),
    defaultValues: { displayName: "", email: "", password: "", passwordConfirm: "" },
  });

  async function onSubmit(values: SetupAdminInput) {
    setServerError(null);
    const result = await setupFirstAdminAction(values);
    if (!result.ok) {
      setServerError(result.message);
      return;
    }
    router.push(result.data.destination);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4" data-testid="setup-form">
      <FormField id="displayName" label="表示名" hint="会員にも見える名前です（例: IPPO運営）" error={errors.displayName?.message}>
        <input id="displayName" className={inputClassName} {...describedBy("displayName", true, errors.displayName?.message)} {...register("displayName")} />
      </FormField>
      <FormField id="email" label="メールアドレス（ログインに使います）" error={errors.email?.message}>
        <input id="email" type="email" autoComplete="username" className={inputClassName} {...describedBy("email", false, errors.email?.message)} {...register("email")} />
      </FormField>
      <FormField id="password" label="パスワード（8文字以上）" error={errors.password?.message}>
        <input id="password" type="password" autoComplete="new-password" className={inputClassName} {...describedBy("password", false, errors.password?.message)} {...register("password")} />
      </FormField>
      <FormField id="passwordConfirm" label="パスワード（確認のためもう一度）" error={errors.passwordConfirm?.message}>
        <input id="passwordConfirm" type="password" autoComplete="new-password" className={inputClassName} {...describedBy("passwordConfirm", false, errors.passwordConfirm?.message)} {...register("passwordConfirm")} />
      </FormField>
      {serverError ? <StatusMessage tone="error" testId="setup-error">{serverError}</StatusMessage> : null}
      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting} data-busy={isSubmitting ? "true" : undefined} data-testid="setup-submit">
        運営アカウントを作る
      </Button>
    </form>
  );
}
