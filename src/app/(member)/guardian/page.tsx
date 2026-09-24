import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { getServiceContext } from "@/server/current-actor";
import { requirePageActor } from "@/server/page-guards";
import { getGuardianHome } from "@/server/services/home-service";

export const metadata: Metadata = { title: "保護者のホーム" };

export default async function GuardianHomePage() {
  const actor = await requirePageActor(["guardian"], "/guardian");
  const home = await getGuardianHome(getServiceContext(), actor);
  return (
    <main data-page="guardian-home" data-state="ready" className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <h1 className="text-2xl font-bold">保護者のホーム</h1>
      {home.children.length === 0 ? (
        <Card>紐づいているお子さまがいません。運営にお問い合わせください。</Card>
      ) : (
        <ul className="space-y-3">
          {home.children.map((child) => (
            <li key={child.userId}>
              <Card data-testid="guardian-child-row" className="space-y-1">
                <p className="font-semibold">{child.displayName}</p>
                <p className="text-sm text-muted-foreground">{child.planName ?? "プラン未加入"}</p>
                <p className="text-sm">ポイント {child.balance} ／ 見た動画 {child.completedVideoCount}本</p>
              </Card>
            </li>
          ))}
        </ul>
      )}
      <p className="text-sm">
        <Link href="/videos" className="font-semibold text-primary underline">クラス動画</Link> と{" "}
        <Link href="/lectures" className="font-semibold text-primary underline">講義</Link> は、お子さまといっしょに見られます。
      </p>
    </main>
  );
}
