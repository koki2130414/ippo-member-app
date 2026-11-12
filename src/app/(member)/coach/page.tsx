import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { requirePageActor } from "@/server/page-guards";

export const metadata: Metadata = { title: "コーチのホーム" };

export default async function CoachHomePage() {
  const actor = await requirePageActor(["coach"], "/coach");
  return (
    <main data-page="coach-home" data-state="ready" className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <h1 className="text-2xl font-bold">コーチのホーム</h1>
      <Card data-testid="coach-assigned-count">担当している生徒: {actor.assignedStudentIds.length}人</Card>
      <Link href="/karte/students" className="block" data-testid="coach-karte-link">
        <Card className="transition-colors hover:bg-muted">
          <p className="font-bold">生徒のカルテ →</p>
          <p className="mt-1 text-sm text-muted-foreground">目標・クラスやパーソナルの記録・フィードバックを書く。声をかけたほうがよい子も分かります。</p>
        </Card>
      </Link>
      <p className="text-sm text-muted-foreground">出欠・ノートへの返信・動画レビューの画面は準備中です（Phase 4）。</p>
    </main>
  );
}
