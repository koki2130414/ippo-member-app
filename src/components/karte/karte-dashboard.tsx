import Link from "next/link";
import { KARTE_KIND_LABELS, type ActivityCounts } from "@/domain/karte";
import type { KarteView } from "@/domain/karte-view";
import { Card } from "../ui/card";
import { DeleteEntryButton } from "./delete-entry-button";
import { ArchiveActionButton } from "./action-form";

/**
 * カルテのダッシュボード（目標 → 行動計画 → 取り組み → フィードバック）。
 * 本人・保護者・コーチで同じ見た目を使い、書ける・見られるの違いは view.can とサービス側の取り出しで決まる。
 */

const STATUS_LABEL = { active: "とりくみ中", achieved: "達成！", paused: "おやすみ中" } as const;
const TERM_LABEL = { season: "シーズン目標", month: "今月の目標" } as const;

export function formatDate(date: string): string {
  const [, month, day] = date.split("-");
  return `${Number(month)}/${Number(day)}`;
}

export function ProgressBar({ value, testId }: { value: number; testId?: string }) {
  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} aria-label="達成度" data-testid={testId}>
      <div className="h-full rounded-full bg-primary print:bg-secondary" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function Stars({ value }: { value: number }) {
  return (
    <span aria-label={`5つのうち${value}`} className="tracking-tight text-primary">
      {"★".repeat(value)}
      <span className="text-border">{"★".repeat(Math.max(0, 5 - value))}</span>
    </span>
  );
}

const COUNT_ITEMS: { key: keyof ActivityCounts; label: string; unit: string }[] = [
  { key: "classes", label: "クラス", unit: "回" },
  { key: "personals", label: "パーソナル", unit: "回" },
  { key: "practices", label: "自主練", unit: "回" },
  { key: "videos", label: "動画", unit: "本" },
  { key: "reflections", label: "振り返り", unit: "回" },
];

export function CountTiles({ counts, previous, testId }: { counts: ActivityCounts; previous?: ActivityCounts; testId?: string }) {
  return (
    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5" data-testid={testId}>
      {COUNT_ITEMS.map((item) => {
        const diff = previous ? counts[item.key] - previous[item.key] : null;
        return (
          <li key={item.key} className="rounded-lg border border-border bg-card px-2 py-3 text-center">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="text-2xl font-bold tabular-nums">
              {counts[item.key]}
              <span className="ml-0.5 text-xs font-normal">{item.unit}</span>
            </p>
            {diff !== null ? (
              <p className="text-xs text-muted-foreground">{diff > 0 ? `前回より +${diff}` : diff === 0 ? "前回と同じ" : `前回 ${previous ? previous[item.key] : 0}`}</p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export function KarteGoals({ view, showArchive }: { view: Pick<KarteView, "goals">; showArchive: boolean }) {
  if (view.goals.length === 0) {
    return <Card data-testid="karte-goals-empty">まだ目標がありません。コーチといっしょに決めてみよう。</Card>;
  }
  return (
    <ul className="space-y-3" data-testid="karte-goals">
      {view.goals.map((goal) => (
        <li key={goal.id}>
          <Card className={goal.status === "achieved" ? "border-success/40" : goal.status === "paused" ? "opacity-70" : "border-primary/50"} data-testid="karte-goal">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-xs font-semibold text-muted-foreground">
                {TERM_LABEL[goal.term]}・{formatDate(goal.startDate)}〜{formatDate(goal.endDate)}
              </p>
              <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-bold" data-testid="karte-goal-status">{STATUS_LABEL[goal.status]}</span>
            </div>
            <p className="mt-1 text-lg font-bold" data-testid="karte-goal-title">{goal.title}</p>
            {goal.reason ? <p className="mt-1 text-sm text-muted-foreground">なぜ: {goal.reason}</p> : null}
            {goal.measure ? <p className="text-sm text-muted-foreground">できたかの見かた: {goal.measure}</p> : null}
            <div className="mt-3 flex items-center gap-3">
              <ProgressBar value={goal.progress} testId="karte-goal-progress" />
              <span className="shrink-0 text-sm font-bold tabular-nums">{goal.progress}%</span>
            </div>
            {goal.actions.length > 0 ? (
              <div className="mt-3">
                <p className="text-xs font-semibold text-muted-foreground">行動計画（やること）</p>
                <ul className="mt-1 space-y-1">
                  {goal.actions.map((action) => (
                    <li key={action.id} className="flex items-start justify-between gap-2 text-sm" data-testid="karte-action">
                      <span>
                        <span aria-hidden="true" className="mr-1 text-primary">●</span>
                        {action.text}
                        {action.frequency ? <span className="ml-1 text-muted-foreground">（{action.frequency}）</span> : null}
                      </span>
                      {showArchive ? <ArchiveActionButton actionId={action.id} /> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {goal.lastRating !== null ? (
              <p className="mt-2 text-sm">
                さいきんの自己評価 <Stars value={goal.lastRating} />
              </p>
            ) : null}
          </Card>
        </li>
      ))}
    </ul>
  );
}

const KIND_STYLE: Record<string, string> = {
  class: "bg-accent",
  personal: "bg-secondary text-secondary-foreground",
  practice: "bg-success/15 text-success",
  reflection: "bg-muted",
  feedback: "bg-primary text-primary-foreground",
  interview: "bg-destructive/10 text-destructive",
};

export function KarteTimeline({ entries, viewerId, canDeleteAll, videoLinkable }: { entries: KarteView["entries"]; viewerId: string; canDeleteAll: boolean; videoLinkable: boolean }) {
  if (entries.length === 0) return <Card data-testid="karte-timeline-empty">まだ記録がありません。</Card>;
  return (
    <ol className="space-y-2" data-testid="karte-timeline">
      {entries.map((entry) => (
        <li key={entry.id}>
          <Card className="space-y-1 p-3" data-testid="karte-entry" data-kind={entry.kind}>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold tabular-nums">{formatDate(entry.date)}</span>
              <span className={`rounded-full px-2 py-0.5 font-bold ${KIND_STYLE[entry.kind] ?? ""}`}>{KARTE_KIND_LABELS[entry.kind]}</span>
              {entry.authorName ? <span className="text-muted-foreground">{entry.authorName}</span> : null}
              {entry.rating !== null ? <Stars value={entry.rating} /> : null}
              {canDeleteAll || entry.authorId === viewerId ? (
                <span className="ml-auto">
                  <DeleteEntryButton entryId={entry.id} />
                </span>
              ) : null}
            </div>
            <p className="font-semibold">{entry.title}</p>
            {entry.body ? <p className="whitespace-pre-wrap text-sm leading-relaxed">{entry.body}</p> : null}
            {entry.videoUrl || entry.modelVideoId ? (
              <p className="flex flex-wrap gap-3 text-sm">
                {entry.videoUrl ? (
                  <a href={entry.videoUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-link underline" data-testid="karte-entry-video">
                    ▶ 自分の動画
                  </a>
                ) : null}
                {entry.modelVideoId && entry.modelVideoTitle ? (
                  videoLinkable ? (
                    <Link href={`/videos/${entry.modelVideoId}`} className="font-semibold text-link underline" data-testid="karte-entry-model-video">
                      ★ お手本: {entry.modelVideoTitle}
                    </Link>
                  ) : (
                    <span data-testid="karte-entry-model-video">★ お手本: {entry.modelVideoTitle}</span>
                  )
                ) : null}
              </p>
            ) : null}
          </Card>
        </li>
      ))}
    </ol>
  );
}
