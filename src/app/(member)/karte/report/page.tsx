import type { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { CountTiles, ProgressBar, Stars, formatDate } from "@/components/karte/karte-dashboard";
import { PrintButton } from "@/components/karte/print-button";
import { toJstMonth } from "@/domain/jst";
import { reportRange } from "@/domain/karte";
import { karteReportQuerySchema } from "@/domain/schemas";
import { getServiceContext } from "@/server/current-actor";
import { loadForPage } from "@/server/page-errors";
import { requirePageActor } from "@/server/page-guards";
import { getKarteReport } from "@/server/services/karte-service";

export const metadata: Metadata = { title: "カルテのレポート" };

function shiftMonth(month: string, delta: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const index = (year ?? 0) * 12 + ((monthNumber ?? 1) - 1) + delta;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

/**
 * 月次・半年のレポート。家庭に渡す前提なので、面談メモはだれが開いても載せない（サービス側で除外）。
 * 最後のページは、子どもが自分で書きこんで家の壁に貼る「目標シート」。
 */
export default async function KarteReportPage({ searchParams }: { searchParams: Promise<{ student?: string; month?: string; months?: string }> }) {
  const raw = await searchParams;
  const actor = await requirePageActor(["student", "guardian", "coach", "admin"], "/karte/report");
  const context = getServiceContext();
  const parsed = karteReportQuerySchema.safeParse(raw);
  const thisMonth = toJstMonth(context.now());
  const month = (parsed.success ? parsed.data.month : undefined) ?? thisMonth;
  const months = parsed.success && parsed.data.months === "6" ? 6 : 1;
  const studentParam = typeof raw.student === "string" ? raw.student : undefined;
  const report = await loadForPage(() => getKarteReport(context, actor, { studentId: studentParam, range: reportRange(month > thisMonth ? thisMonth : month, months) }));
  const query = (nextMonth: string, nextMonths: number) => `/karte/report?${new URLSearchParams({ ...(studentParam ? { student: studentParam } : {}), month: nextMonth, months: String(nextMonths) }).toString()}`;
  const backHref = actor.role === "coach" || actor.role === "admin" ? `/karte/students/${report.student.userId}` : actor.role === "guardian" ? `/karte?child=${report.student.userId}` : "/karte";
  const mainGoal = report.goals.find((goal) => goal.status === "active") ?? report.goals[0] ?? null;

  return (
    <main data-page="karte-report" data-state="ready" className="karte-report mx-auto max-w-3xl space-y-6 px-4 py-6 print:max-w-none print:p-0">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link href={backHref} className="text-sm font-semibold text-link">← カルテにもどる</Link>
        <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
          <Link href={query(shiftMonth(month, -months), months)} className="rounded-full bg-muted px-3 py-1" data-testid="karte-report-prev">← 前</Link>
          {month < thisMonth ? <Link href={query(shiftMonth(month, months), months)} className="rounded-full bg-muted px-3 py-1">次 →</Link> : null}
          <Link href={query(month, months === 1 ? 6 : 1)} className="rounded-full border-2 border-secondary px-3 py-1">{months === 1 ? "半年で見る" : "1か月で見る"}</Link>
          <PrintButton />
        </div>
      </div>

      {/* 1ページ目: レポート */}
      <section className="report-page space-y-5" aria-labelledby="report-heading">
        <header className="flex items-center justify-between gap-4 border-b-4 border-primary pb-3">
          <div>
            <p className="text-sm text-muted-foreground">{months === 1 ? "月のレポート" : "半年のレポート"}・{report.range.label}</p>
            <h1 id="report-heading" className="text-2xl font-bold" data-testid="karte-report-title">{report.student.displayName}さんの成長レポート</h1>
          </div>
          <BrandLogo href="/karte" className="h-10 shrink-0" />
        </header>

        <div>
          <h2 className="mb-2 font-bold">目標と達成度</h2>
          {report.goals.length === 0 ? (
            <p className="text-sm text-muted-foreground">この期間の目標はありません。</p>
          ) : (
            <ul className="space-y-2" data-testid="karte-report-goals">
              {report.goals.map((goal) => (
                <li key={goal.id} className="rounded-lg border border-border p-3 break-inside-avoid">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-bold">{goal.title}</p>
                    <p className="shrink-0 text-sm font-bold tabular-nums">{goal.status === "achieved" ? "達成！" : `${goal.progress}%`}</p>
                  </div>
                  <div className="mt-2"><ProgressBar value={goal.status === "achieved" ? 100 : goal.progress} /></div>
                  {goal.actions.length > 0 ? <p className="mt-2 text-sm text-muted-foreground">やること: {goal.actions.map((action) => action.text + (action.frequency ? `（${action.frequency}）` : "")).join(" ／ ")}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h2 className="mb-1 font-bold">つみあげ</h2>
          <p className="mb-2 text-xs text-muted-foreground">くらべる相手は、前の{months === 1 ? "月" : "半年"}の自分だけ。</p>
          <CountTiles counts={report.counts} previous={report.previousCounts} testId="karte-report-counts" />
          {report.averageRating !== null ? (
            <p className="mt-2 text-sm">
              振り返りの自己評価（平均） <Stars value={Math.round(report.averageRating)} /> <span className="tabular-nums">{report.averageRating}</span>
            </p>
          ) : null}
        </div>

        {report.feedbacks.length > 0 ? (
          <div className="break-inside-avoid">
            <h2 className="mb-2 font-bold">コーチから</h2>
            <ul className="space-y-2" data-testid="karte-report-feedbacks">
              {report.feedbacks.map((entry) => (
                <li key={entry.id} className="rounded-lg bg-accent p-3 text-sm">
                  <p className="font-bold">{formatDate(entry.date)} {entry.title}<span className="ml-2 text-xs font-normal text-muted-foreground">{entry.authorName}</span></p>
                  {entry.body ? <p className="mt-1 whitespace-pre-wrap">{entry.body}</p> : null}
                  {entry.modelVideoTitle ? <p className="mt-1 text-xs">★ お手本の動画: {entry.modelVideoTitle}</p> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {report.personals.length > 0 ? (
          <div className="break-inside-avoid">
            <h2 className="mb-2 font-bold">パーソナルでやったこと</h2>
            <ul className="space-y-1 text-sm">
              {report.personals.map((entry) => (
                <li key={entry.id}><span className="font-bold tabular-nums">{formatDate(entry.date)}</span> {entry.title}{entry.body ? ` — ${entry.body}` : ""}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {report.practices.length > 0 || report.reflections.length > 0 ? (
          <div className="break-inside-avoid">
            <h2 className="mb-2 font-bold">自分でがんばったこと</h2>
            <ul className="space-y-1 text-sm">
              {[...report.practices, ...report.reflections].sort((a, b) => a.date.localeCompare(b.date)).slice(-12).map((entry) => (
                <li key={entry.id}>
                  <span className="font-bold tabular-nums">{formatDate(entry.date)}</span> {entry.title}
                  {entry.rating !== null ? <> <Stars value={entry.rating} /></> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {report.completedVideoTitles.length > 0 ? (
          <div className="break-inside-avoid">
            <h2 className="mb-2 font-bold">見おわった動画（{report.completedVideoTitles.length}本）</h2>
            <p className="text-sm text-muted-foreground">{report.completedVideoTitles.slice(0, 12).join("・")}{report.completedVideoTitles.length > 12 ? " ほか" : ""}</p>
          </div>
        ) : null}

        <p className="text-right text-xs text-muted-foreground">{report.generatedOn} 作成・IPPO</p>
      </section>

      {/* 2ページ目: 壁に貼る目標シート（手で書きこむ） */}
      <section className="goal-sheet space-y-4 rounded-2xl border-4 border-secondary p-5 print:mt-0 print:rounded-none" aria-labelledby="sheet-heading" data-testid="karte-goal-sheet">
        <div className="flex items-center justify-between gap-2">
          <h2 id="sheet-heading" className="text-2xl font-bold">わたしの目標シート</h2>
          <p className="text-sm">なまえ <span className="inline-block min-w-[8em] border-b-2 border-secondary text-center font-bold">{report.student.displayName}</span></p>
        </div>
        <p className="text-sm text-muted-foreground">レポートを見て、つぎの目標を自分で書いてみよう。書けたら、家の見えるところに貼ろう。</p>

        <div className="rounded-xl bg-accent p-3 text-sm print:border print:border-secondary print:bg-transparent">
          <p className="font-bold">いまの目標（コーチといっしょに決めたもの）</p>
          <p className="mt-1">{mainGoal ? mainGoal.title : "—"}{mainGoal ? `（いま ${mainGoal.progress}%）` : ""}</p>
        </div>

        {[
          { label: "つぎの目標", hint: "どうなりたい？" },
          { label: "なぜ？", hint: "それができると、どんないいことがある？" },
          { label: "できたかどうかの見かた", hint: "例: 10本中7本ねらった所に" },
        ].map((row) => (
          <div key={row.label}>
            <p className="font-bold">{row.label}<span className="ml-2 text-xs font-normal text-muted-foreground">{row.hint}</span></p>
            <div className="mt-1 h-10 border-b-2 border-dashed border-secondary/60" />
          </div>
        ))}

        <div>
          <p className="font-bold">やること（行動計画）<span className="ml-2 text-xs font-normal text-muted-foreground">できた日に ○ をつけよう</span></p>
          <table className="mt-2 w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-secondary/60 p-1 text-left font-bold">やること・回数</th>
                {["1週", "2週", "3週", "4週"].map((week) => (
                  <th key={week} className="w-14 border border-secondary/60 p-1 text-center font-bold">{week}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[0, 1, 2].map((row) => (
                <tr key={row}>
                  <td className="h-12 border border-secondary/60 p-1" />
                  {[0, 1, 2, 3].map((week) => (
                    <td key={week} className="border border-secondary/60" />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 print:grid-cols-2">
          <div className="rounded-xl border-2 border-secondary/60 p-3">
            <p className="text-sm font-bold">おうちの人から ひとこと</p>
            <div className="h-16" />
          </div>
          <div className="rounded-xl border-2 border-secondary/60 p-3">
            <p className="text-sm font-bold">コーチから ひとこと</p>
            <div className="h-16" />
          </div>
        </div>
        <p className="text-right text-xs text-muted-foreground">{report.range.label}のレポートから</p>
      </section>
    </main>
  );
}
