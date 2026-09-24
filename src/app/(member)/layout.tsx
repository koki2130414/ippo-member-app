import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { getCurrentActor, getServiceContext } from "@/server/current-actor";
import { isDemoMode } from "@/server/env";

/**
 * 会員画面の共通レイアウト。ヘッダーを出すためにログイン中の人を読む。
 * ロールの判定は各ページの requirePageActor で行う（レイアウトは現在のパスを知らないため）。
 */
export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/login");
  const profile = await getServiceContext().store.getPublicProfile(actor.userId);
  return (
    <>
      <SiteHeader role={actor.role} displayName={profile?.displayName ?? ""} isDemo={isDemoMode()} />
      {children}
    </>
  );
}
