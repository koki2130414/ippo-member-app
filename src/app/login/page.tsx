import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DemoLoginPanel } from "@/components/demo-login-panel";
import { StatusMessage } from "@/components/status-message";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ROLE_HOME } from "@/domain/authorization";
import { USER_ROLES, type UserRole } from "@/domain/types";
import { resetDemoDataAction } from "@/server/actions/auth-actions";
import { getCurrentActor, getServiceContext } from "@/server/current-actor";
import { isDemoMode } from "@/server/env";
import { safeNextPath } from "@/server/page-guards";

export const metadata: Metadata = { title: "ログイン" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const actor = await getCurrentActor();
  if (actor) redirect(ROLE_HOME[actor.role]);

  const demo = isDemoMode();
  const rawNext = typeof params.next === "string" ? params.next : null;
  const next = rawNext ? safeNextPath(rawNext) : null;

  let availableRoles: UserRole[] = [];
  if (demo) {
    const store = getServiceContext().store;
    const counts = await Promise.all(USER_ROLES.map(async (role) => ({ role, total: (await store.listMembers({ role, page: 1, pageSize: 1 })).total })));
    availableRoles = counts.filter((item) => item.total > 0).map((item) => item.role);
  }

  return (
    <main data-page="login" data-state="ready" className="mx-auto max-w-md space-y-6 px-4 py-10">
      <div>
        <Link href="/" className="text-sm font-semibold text-primary">IPPO</Link>
        <h1 className="mt-2 text-2xl font-bold">ログイン</h1>
      </div>

      {params.reset === "1" ? <StatusMessage tone="success" testId="demo-reset-done">デモのデータを最初の状態にもどしました</StatusMessage> : null}
      {next ? <StatusMessage tone="info">ログインすると、見ようとしていたページにもどります</StatusMessage> : null}

      {demo ? (
        <Card className="space-y-4">
          <div>
            <h2 className="font-bold">デモでためす</h2>
            <p className="mt-1 text-sm text-muted-foreground">パスワードなしで、それぞれの立場の画面を見られます。登場する人はすべて架空です。</p>
          </div>
          <DemoLoginPanel availableRoles={availableRoles} next={next} />
          {!availableRoles.includes("student") ? (
            <p className="text-xs text-muted-foreground">生徒のサンプルを見るには、IPPO_SEED=sample を設定して起動してください。</p>
          ) : null}
          <form action={resetDemoDataAction}>
            <Button type="submit" variant="ghost" size="sm" data-testid="demo-reset">デモのデータを最初の状態にもどす</Button>
          </form>
        </Card>
      ) : (
        <Card>
          <p className="text-sm">メールアドレスでのログインは準備中です。運営からの案内をお待ちください。</p>
        </Card>
      )}
    </main>
  );
}
