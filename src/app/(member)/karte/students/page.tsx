import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/components/karte/karte-dashboard";
import { getServiceContext } from "@/server/current-actor";
import { loadForPage } from "@/server/page-errors";
import { requirePageActor } from "@/server/page-guards";
import { listKarteStudents } from "@/server/services/karte-service";

export const metadata: Metadata = { title: "生徒のカルテ" };

/** コーチ（担当の子だけ）と運営（全員）の一覧。声をかけたほうがよい子が上に来る */
export default async function KarteStudentsPage() {
  const actor = await requirePageActor(["coach", "admin"], "/karte/students");
  const rows = await loadForPage(() => listKarteStudents(getServiceContext(), actor));
  const followCount = rows.filter((row) => row.followUp.needed).length;

  return (
    <main data-page="karte-students" data-state="ready" className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <h1 className="text-2xl font-bold">生徒のカルテ</h1>
      <p className="text-sm text-muted-foreground">
        {actor.role === "coach" ? "担当している生徒" : "すべての生徒"} {rows.length}人
        {followCount > 0 ? <>・<span className="font-bold text-destructive" data-testid="karte-follow-count">声かけの目安 {followCount}人</span></> : null}
        。数字は直近30日です。
      </p>
      {rows.length === 0 ? (
        <Card data-testid="karte-students-empty">{actor.role === "coach" ? "担当している生徒がまだいません。運営に担当の設定をお願いしてください。" : "生徒がまだいません。"}</Card>
      ) : (
        <ul className="space-y-2" data-testid="karte-students">
          {rows.map((row) => (
            <li key={row.userId}>
              <Link href={`/karte/students/${row.userId}`} className="block" data-testid="karte-student-row">
                <Card className={`space-y-2 transition-colors hover:bg-muted ${row.followUp.needed ? "border-destructive/50" : ""}`}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-lg font-bold">{row.displayName}</p>
                    <p className="text-xs text-muted-foreground">{row.planName ?? "プラン未加入"}・目標 {row.activeGoals}件</p>
                  </div>
                  <p className="text-sm tabular-nums">
                    クラス {row.last30.classes}・パーソナル {row.last30.personals}・自主練 {row.last30.practices}・動画 {row.last30.videos}
                  </p>
                  {row.followUp.needed ? (
                    <p className="text-sm font-semibold text-destructive" data-testid="karte-student-follow">
                      声かけの目安: {row.followUp.reasons.join(" / ")}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      さいごのクラス {row.followUp.lastClassDate ? formatDate(row.followUp.lastClassDate) : "—"}・さいごの記録 {row.followUp.lastActivityDate ? formatDate(row.followUp.lastActivityDate) : "—"}
                    </p>
                  )}
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
