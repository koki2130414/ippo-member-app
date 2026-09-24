import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { requirePageActor } from "@/server/page-guards";

export const metadata: Metadata = { title: "コーチのホーム" };

export default async function CoachHomePage() {
  const actor = await requirePageActor(["coach"], "/coach");
  return (
    <main data-page="coach-home" data-state="ready" className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <h1 className="text-2xl font-bold">コーチのホーム</h1>
      <Card data-testid="coach-assigned-count">担当している生徒: {actor.assignedStudentIds.length}人</Card>
      <p className="text-sm text-muted-foreground">出欠・ノートへの返信・動画レビューの画面は準備中です（Phase 4）。</p>
    </main>
  );
}
