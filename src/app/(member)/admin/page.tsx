import type { Metadata } from "next";
import { requirePageActor } from "@/server/page-guards";

export const metadata: Metadata = { title: "運営のホーム" };

export default async function AdminHomePage() {
  await requirePageActor(["admin"], "/admin");
  return (
    <main data-page="admin-home" data-state="ready" className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <h1 className="text-2xl font-bold">運営のホーム</h1>
      <p className="text-sm text-muted-foreground">会員・動画・講義などの管理画面は準備中です（Phase 5）。</p>
    </main>
  );
}
