import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CountTiles, KarteGoals, KarteTimeline } from "@/components/karte/karte-dashboard";
import { EntryForm } from "@/components/karte/entry-form";
import { GoalForm } from "@/components/karte/goal-form";
import { ActionForm } from "@/components/karte/action-form";
import { Card } from "@/components/ui/card";
import { addJstDays, toJstDate } from "@/domain/jst";
import { getServiceContext } from "@/server/current-actor";
import { loadForPage } from "@/server/page-errors";
import { requirePageActor } from "@/server/page-guards";
import { getKarte } from "@/server/services/karte-service";

export const metadata: Metadata = { title: "カルテ" };

/** 本人と保護者のカルテ。コーチ・運営は生徒の一覧から開く */
export default async function KartePage({ searchParams }: { searchParams: Promise<{ child?: string }> }) {
  const { child } = await searchParams;
  const actor = await requirePageActor(["student", "guardian", "coach", "admin"], "/karte");
  if (actor.role === "coach" || actor.role === "admin") redirect("/karte/students");
  const context = getServiceContext();
  if (actor.role === "guardian" && actor.linkedStudentIds.length === 0) {
    return (
      <main data-page="karte" data-state="empty" className="mx-auto max-w-3xl px-4 py-6">
        <Card>紐づいているお子さまがいません。運営にお問い合わせください。</Card>
      </main>
    );
  }
  const view = await loadForPage(() => getKarte(context, actor, child));
  const childNames =
    actor.role === "guardian" && actor.linkedStudentIds.length > 1
      ? await Promise.all(actor.linkedStudentIds.map(async (id) => ({ id, name: (await context.store.getPublicProfile(id))?.displayName ?? "" })))
      : [];
  const today = toJstDate(context.now());
  const reportHref = actor.role === "guardian" ? `/karte/report?student=${view.student.userId}` : "/karte/report";
  const isSelf = actor.role === "student";

  return (
    <main data-page="karte" data-state="ready" className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm text-muted-foreground">{isSelf ? "じぶんの" : `${view.student.displayName}さんの`}</p>
          <h1 className="text-2xl font-bold">カルテ</h1>
        </div>
        <div className="flex flex-wrap gap-2 text-sm font-semibold">
          <Link href={reportHref} className="rounded-full border-2 border-secondary px-3 py-1" data-testid="karte-report-link">月のレポート</Link>
          <Link href={`${reportHref}${reportHref.includes("?") ? "&" : "?"}months=6`} className="rounded-full border-2 border-secondary px-3 py-1" data-testid="karte-half-report-link">半年のレポート</Link>
        </div>
      </div>

      {childNames.length > 0 ? (
        <nav aria-label="お子さまをえらぶ" className="flex flex-wrap gap-2">
          {childNames.map((item) => (
            <Link key={item.id} href={`/karte?child=${item.id}`} aria-current={item.id === view.student.userId ? "page" : undefined} className={`rounded-full px-3 py-1 text-sm font-bold ${item.id === view.student.userId ? "bg-secondary text-secondary-foreground" : "bg-muted"}`}>
              {item.name}
            </Link>
          ))}
        </nav>
      ) : null}

      <section aria-labelledby="karte-goals-heading" className="space-y-3">
        <h2 id="karte-goals-heading" className="text-lg font-bold">目標と、やること</h2>
        <KarteGoals view={view} showArchive={view.can.writeGoal} />
      </section>

      <section aria-labelledby="karte-month-heading" className="space-y-3">
        <h2 id="karte-month-heading" className="text-lg font-bold">{view.monthLabel}のつみあげ</h2>
        <CountTiles counts={view.thisMonth} testId="karte-month-counts" />
      </section>

      {view.can.writeKinds.length > 0 ? (
        <section aria-labelledby="karte-write-heading" className="space-y-3">
          <h2 id="karte-write-heading" className="text-lg font-bold">きょうの記録を書く</h2>
          <Card>
            <EntryForm studentId={view.student.userId} kinds={view.can.writeKinds} goals={view.goals.filter((goal) => goal.status === "active").map((goal) => ({ id: goal.id, title: goal.title }))} modelVideos={[]} today={today} />
          </Card>
        </section>
      ) : null}

      <section aria-labelledby="karte-timeline-heading" className="space-y-3">
        <h2 id="karte-timeline-heading" className="text-lg font-bold">記録</h2>
        <KarteTimeline entries={view.entries} viewerId={actor.userId} canDeleteAll={false} videoLinkable />
      </section>

      {view.can.writeGoal ? (
        <details className="rounded-lg border border-border p-4">
          <summary className="cursor-pointer font-bold" data-testid="karte-goal-editor-toggle">目標・やることを書きかえる</summary>
          <div className="mt-4 space-y-6">
            <GoalForm
              studentId={view.student.userId}
              initial={{ term: "month", title: "", reason: "", measure: "", startDate: today, endDate: addJstDays(today, 30), status: "active", progress: 0 }}
              goals={view.goals.map((goal) => ({ goalId: goal.id, term: goal.term, title: goal.title, reason: goal.reason, measure: goal.measure, startDate: goal.startDate, endDate: goal.endDate, status: goal.status, progress: goal.progress }))}
            />
            <hr className="border-border" />
            <ActionForm goals={view.goals.filter((goal) => goal.status === "active").map((goal) => ({ id: goal.id, title: goal.title }))} />
          </div>
        </details>
      ) : null}
    </main>
  );
}
