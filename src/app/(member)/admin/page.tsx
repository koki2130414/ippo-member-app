import type { Metadata } from "next";
import Link from "next/link";
import { requirePageActor } from "@/server/page-guards";

export const metadata: Metadata = { title: "運営のホーム" };

export default async function AdminHomePage() {
  await requirePageActor(["admin"], "/admin");
  return (
    <main data-page="admin-home" data-state="ready" className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <h1 className="text-2xl font-bold">運営のホーム</h1>
      <ul className="grid gap-3 sm:grid-cols-2">
        <li>
          <Link href="/admin/applications" data-testid="admin-go-applications" className="block rounded-lg border border-border p-4 hover:bg-muted">
            <p className="font-semibold">入会の申し込み</p>
            <p className="text-sm text-muted-foreground">承認・見送りと、ログイン用リンクの発行</p>
          </Link>
        </li>
        <li>
          <Link href="/admin/users?tab=members" data-testid="admin-go-users" className="block rounded-lg border border-border p-4 hover:bg-muted">
            <p className="font-semibold">会員の管理</p>
            <p className="text-sm text-muted-foreground">会員の追加・プランの割り当て・ログイン用リンク</p>
          </Link>
        </li>
      </ul>
      <p className="text-sm text-muted-foreground">動画・講義・お知らせなどの管理画面は準備中です（Phase 5）。</p>
    </main>
  );
}
