import { BrandLogo } from "@/components/brand-logo";
import type { Metadata } from "next";
import Link from "next/link";
import { SetupAdminForm } from "@/components/setup-admin-form";
import { Card } from "@/components/ui/card";
import { getServiceContext } from "@/server/current-actor";
import { canSetupFirstAdmin } from "@/server/services/account-service";

export const metadata: Metadata = { title: "最初の運営アカウント" };
// 運営がいるかどうかは毎回確かめる（静的に書き出すと、作ったあとも入口が開いたままに見える）
export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const open = await canSetupFirstAdmin(getServiceContext());
  return (
    <main data-page="setup" data-state="ready" className="mx-auto max-w-md space-y-6 px-4 py-10">
      <div>
        <BrandLogo className="h-10" priority />
        <h1 className="mt-2 text-2xl font-bold">最初の運営アカウント</h1>
      </div>
      {open ? (
        <Card className="space-y-4">
          <p className="text-sm text-muted-foreground">運営アカウントがまだ1つもないため、ここで最初の1つを作れます。作ったあとは、この画面は使えなくなります。</p>
          <SetupAdminForm />
        </Card>
      ) : (
        <Card className="space-y-2" data-testid="setup-closed">
          <p className="font-semibold">運営アカウントは、もう作られています</p>
          <p className="text-sm text-muted-foreground">
            <Link href="/login" className="font-semibold text-link underline">ログイン画面</Link>からログインしてください。運営を追加するときは、運営の画面から行います。
          </p>
        </Card>
      )}
    </main>
  );
}
