import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { getServiceContext } from "@/server/current-actor";
import { requirePageActor } from "@/server/page-guards";
import { getStudentHome } from "@/server/services/home-service";

export const metadata: Metadata = { title: "ホーム" };

export default async function StudentHomePage() {
  const actor = await requirePageActor(["student"], "/home");
  const home = await getStudentHome(getServiceContext(), actor);

  return (
    <main data-page="student-home" data-state="ready" className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <div>
        <p className="text-sm text-muted-foreground">{home.planName ?? "プラン未加入"}</p>
        <h1 className="text-2xl font-bold">こんにちは、{home.displayName}</h1>
      </div>

      <Card className="space-y-1" data-testid="home-streak">
        <p className="text-sm text-muted-foreground">つづけている日数</p>
        <p className="text-3xl font-bold text-primary">{home.streak.currentDays}<span className="ml-1 text-base">日</span></p>
        <p className="text-sm">{home.streakMessage}</p>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Card data-testid="home-points">
          <p className="text-xs text-muted-foreground">ポイント</p>
          <p className="text-2xl font-bold">{home.balance}</p>
        </Card>
        <Card data-testid="home-videos-done">
          <p className="text-xs text-muted-foreground">見た動画</p>
          <p className="text-2xl font-bold">{home.completedVideoCount}</p>
        </Card>
        <Card data-testid="home-lectures-done">
          <p className="text-xs text-muted-foreground">読んだ講義</p>
          <p className="text-2xl font-bold">{home.completedLectureCount}</p>
        </Card>
      </div>

      <section aria-labelledby="next-heading" className="space-y-3">
        <h2 id="next-heading" className="text-lg font-bold">きょうの一歩</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/videos" data-testid="home-go-videos" className="rounded-lg border border-border p-4 hover:bg-muted">
            <p className="font-semibold">クラス動画を見る</p>
            <p className="text-sm text-muted-foreground">サッカーIQ・メンタリティ・フィットネス</p>
          </Link>
          <Link href="/lectures" data-testid="home-go-lectures" className="rounded-lg border border-border p-4 hover:bg-muted">
            <p className="font-semibold">講義を読む</p>
            <p className="text-sm text-muted-foreground">読んだら、クイズでたしかめよう</p>
          </Link>
        </div>
      </section>
    </main>
  );
}
