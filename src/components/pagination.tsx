import Link from "next/link";
import { buttonVariants } from "./ui/button";

/** 無限スクロールは作らない。「前へ」「次へ」と ?page=（仕様 10.3） */
export function Pagination({ basePath, page, pageSize, total, extraQuery }: { basePath: string; page: number; pageSize: number; total: number; extraQuery: Record<string, string | undefined> }) {
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  if (lastPage <= 1) return null;
  const hrefFor = (target: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(extraQuery)) if (value) params.set(key, value);
    if (target > 1) params.set("page", String(target));
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  };
  return (
    <nav aria-label="ページ送り" className="flex items-center justify-between gap-2">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={buttonVariants({ variant: "outline", size: "sm" })} data-testid="pagination-prev">前へ</Link>
      ) : (
        <span />
      )}
      <span className="text-sm text-muted-foreground">{page} / {lastPage} ページ</span>
      {page < lastPage ? (
        <Link href={hrefFor(page + 1)} className={buttonVariants({ variant: "outline", size: "sm" })} data-testid="pagination-next">次へ</Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
