import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/karte/action-form";
import { EntryForm } from "@/components/karte/entry-form";
import { GoalForm } from "@/components/karte/goal-form";
import { CountTiles, KarteGoals, KarteTimeline } from "@/components/karte/karte-dashboard";
import { StatusMessage } from "@/components/status-message";
import { Card } from "@/components/ui/card";
import { addJstDays, toJstDate } from "@/domain/jst";
import { getServiceContext } from "@/server/current-actor";
import { loadForPage } from "@/server/page-errors";
import { requirePageActor } from "@/server/page-guards";
import { getKarte, listModelVideoOptions } from "@/server/services/karte-service";

export const metadata: Metadata = { title: "生徒のカルテ" };

/** コーチ・運営が開く一人分のカルテ。ここで目標・クラス・パーソナル・面談・フィードバックを書く */
export default async function KarteStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requirePageActor(["coach", "admin"], `/karte/students/${id}`);
  const context = getServiceContext();
  const [view, modelVideos] = await loadForPage(() => Promise.all([getKarte(context, actor, id), listModelVideoOptions(context, actor)]));
  const today = toJstDate(context.now());
  const activeGoals = view.goals.filter((goal) => goal.status === "active").map((goal) => ({ id: goal.id, title: goal.title }));

  return (
    <main data-page="karte-student" data-state="ready" className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <Link href="/karte/students" className="text-sm font-semibold text-link" data-testid="karte-back">← 生徒の一覧</Link>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">{view.student.displayName}さんのカルテ</h1>
          <p className="text-sm text-muted-foreground">{view.student.planName ?? "プラン未加入"}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm font-semibold">
          <Link href={`/karte/report?student=${view.student.userId}`} className="rounded-full border-2 border-secondary px-3 py-1" data-testid="karte-report-link">月のレポート</Link>
          <Link href={`/karte/report?student=${view.student.userId}&months=6`} className="rounded-full border-2 border-secondary px-3 py-1">半年のレポート</Link>
        </div>
      </div>

      {view.followUp?.needed ? (
        <StatusMessage tone="error" testId="karte-follow-up">声かけの目安: {view.followUp.reasons.join(" / ")}</StatusMessage>
      ) : null}

      <section aria-labelledby="goals-heading" className="space-y-3">
        <h2 id="goals-heading" className="text-lg font-bold">目標と、やること</h2>
        <KarteGoals view={view} showArchive={view.can.writeGoal} />
      </section>

      <section aria-labelledby="month-heading" className="space-y-3">
        <h2 id="month-heading" className="text-lg font-bold">{view.monthLabel}のつみあげ</h2>
        <CountTiles counts={view.thisMonth} testId="karte-month-counts" />
      </section>

      <section aria-labelledby="write-heading" className="space-y-3">
        <h2 id="write-heading" className="text-lg font-bold">記録を書く</h2>
        <p className="text-sm text-muted-foreground">クラスの内容・パーソナルのメモ・フィードバック（動画つき）・面談メモ（コーチだけ）を残せます。</p>
        <Card>
          <EntryForm studentId={view.student.userId} kinds={view.can.writeKinds} goals={activeGoals} modelVideos={modelVideos} today={today} />
        </Card>
      </section>

      <section aria-labelledby="goal-edit-heading" className="space-y-3">
        <h2 id="goal-edit-heading" className="text-lg font-bold">目標・やることを決める</h2>
        <Card className="space-y-6">
          <GoalForm
            studentId={view.student.userId}
            initial={{ term: "month", title: "", reason: "", measure: "", startDate: today, endDate: addJstDays(today, 30), status: "active", progress: 0 }}
            goals={view.goals.map((goal) => ({ goalId: goal.id, term: goal.term, title: goal.title, reason: goal.reason, measure: goal.measure, startDate: goal.startDate, endDate: goal.endDate, status: goal.status, progress: goal.progress }))}
          />
          <hr className="border-border" />
          <ActionForm goals={activeGoals} />
        </Card>
      </section>

      <section aria-labelledby="timeline-heading" className="space-y-3">
        <h2 id="timeline-heading" className="text-lg font-bold">記録</h2>
        <KarteTimeline entries={view.entries} viewerId={actor.userId} canDeleteAll={actor.role === "admin"} videoLinkable={actor.role === "admin"} />
      </section>
    </main>
  );
}
