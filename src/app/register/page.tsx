import type { Metadata } from "next";
import Link from "next/link";
import { RegistrationForm } from "@/components/registration-form";
import { Card } from "@/components/ui/card";
import { isDemoMode } from "@/server/env";

export const metadata: Metadata = { title: "入会の申し込み" };
export const dynamic = "force-dynamic";

export default function RegisterPage() {
  return (
    <main data-page="register" data-state="ready" className="mx-auto max-w-md space-y-6 px-4 py-10">
      <div>
        <Link href="/" className="text-sm font-semibold text-primary">IPPO</Link>
        <h1 className="mt-2 text-2xl font-bold">入会の申し込み</h1>
        <p className="mt-2 text-sm text-muted-foreground">保護者の方がお申し込みください。運営が確認したあと、ログイン用のリンクをお送りします。</p>
      </div>
      {isDemoMode() ? (
        <p role="note" className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive" data-testid="register-demo-warning">
          いまは準備中（デモ）のため、本当のお名前やメールアドレスは入れないでください。
        </p>
      ) : null}
      <Card>
        <RegistrationForm />
      </Card>
      <p className="text-sm">すでに会員の方は <Link href="/login" className="font-semibold text-primary underline">ログイン</Link></p>
    </main>
  );
}
