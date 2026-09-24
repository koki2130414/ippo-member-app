import Link from "next/link";
import { signOutAction } from "@/server/actions/auth-actions";
import type { UserRole } from "@/domain/types";
import { Button } from "./ui/button";

const NAV_BY_ROLE: Record<UserRole, { href: string; label: string; testId: string }[]> = {
  student: [
    { href: "/home", label: "ホーム", testId: "nav-home" },
    { href: "/videos", label: "クラス動画", testId: "nav-videos" },
    { href: "/lectures", label: "講義", testId: "nav-lectures" },
  ],
  guardian: [
    { href: "/guardian", label: "ホーム", testId: "nav-home" },
    { href: "/videos", label: "クラス動画", testId: "nav-videos" },
    { href: "/lectures", label: "講義", testId: "nav-lectures" },
  ],
  coach: [{ href: "/coach", label: "コーチのホーム", testId: "nav-home" }],
  admin: [{ href: "/admin", label: "運営のホーム", testId: "nav-home" }],
};

const ROLE_LABEL: Record<UserRole, string> = { student: "生徒", guardian: "保護者", coach: "コーチ", admin: "運営" };

/** 会員画面の共通ヘッダー。表示名だけを出し、本名は出さない */
export function SiteHeader({ role, displayName, isDemo }: { role: UserRole; displayName: string; isDemo: boolean }) {
  return (
    <header className="border-b border-border bg-background" data-role={role}>
      {isDemo ? (
        <p className="bg-accent px-4 py-1 text-center text-xs font-semibold text-accent-foreground" data-testid="demo-banner">
          デモモードです。ここで作ったデータは、サーバーが再起動すると消えます
        </p>
      ) : null}
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2 px-4 py-3">
        <Link href={NAV_BY_ROLE[role][0]?.href ?? "/"} className="text-lg font-bold text-primary">IPPO</Link>
        <div className="flex items-center gap-2 text-sm">
          <span data-testid="header-display-name">
            {displayName}
            <span className="ml-1 text-xs text-muted-foreground">（{ROLE_LABEL[role]}）</span>
          </span>
          <form action={signOutAction}>
            <Button type="submit" variant="ghost" size="sm" data-testid="header-sign-out">ログアウト</Button>
          </form>
        </div>
      </div>
      <nav aria-label="メインメニュー" className="mx-auto max-w-3xl px-4 pb-2">
        <ul className="flex gap-4 text-sm font-semibold">
          {NAV_BY_ROLE[role].map((item) => (
            <li key={item.href}>
              <Link href={item.href} data-testid={item.testId} className="inline-block py-1 hover:text-primary">{item.label}</Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
