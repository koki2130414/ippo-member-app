import Link from "next/link";
import { cn } from "@/lib/utils";

export interface QueryTab {
  /** URL の ?tab= に入る値。undefined は「すべて」 */
  value: string | undefined;
  label: string;
}

/**
 * タブは URL のクエリで持つ（仕様 10.3）。直リンクで同じ状態を再現でき、自動操作もリンクをたどるだけで切り替えられる。
 * タブを切り替えたらページは1に戻す（前のタブの3ページ目、のような存在しない状態を作らない）。
 */
export function QueryTabs({
  basePath,
  tabs,
  current,
  testIdPrefix,
  label,
  extraQuery = {},
  param = "tab",
}: {
  basePath: string;
  tabs: QueryTab[];
  current: string | undefined;
  testIdPrefix: string;
  label: string;
  /** タブを切り替えても残したいほかの絞りこみ（例: クラス動画のカテゴリーと担当コーチ） */
  extraQuery?: Record<string, string | undefined>;
  /** URL のどのクエリに入れるか（既定は ?tab=） */
  param?: string;
}) {
  const hrefFor = (value: string | undefined) => {
    const params = new URLSearchParams();
    for (const [key, extra] of Object.entries(extraQuery)) if (extra && key !== param) params.set(key, extra);
    if (value) params.set(param, value);
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  };
  return (
    <nav aria-label={label} className="-mx-4 overflow-x-auto px-4">
      <ul className="flex gap-2">
        {tabs.map((tab) => {
          const active = tab.value === current;
          return (
            <li key={tab.value ?? "all"}>
              <Link
                href={hrefFor(tab.value)}
                aria-current={active ? "page" : undefined}
                data-testid={`${testIdPrefix}-tab`}
                data-tab={tab.value ?? "all"}
                className={cn(
                  "inline-block whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold",
                  active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-muted",
                )}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
