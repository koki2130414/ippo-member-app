import type { Metadata } from "next";
import Link from "next/link";
import { EntitlementNotice } from "@/components/entitlement-notice";
import { Pagination } from "@/components/pagination";
import { QueryTabs } from "@/components/query-tabs";
import { describeEntitlement } from "@/domain/plans";
import { listQuerySchema } from "@/domain/schemas";
import { getServiceContext } from "@/server/current-actor";
import { loadForPage } from "@/server/page-errors";
import { requirePageActor } from "@/server/page-guards";
import { listLecturesForMember } from "@/server/services/lecture-service";

export const metadata: Metadata = { title: "講義" };

export default async function LecturesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const actor = await requirePageActor(["student", "guardian"], "/lectures");
  const query = listQuerySchema.parse(await searchParams);
  const context = getServiceContext();
  // タブの値はカテゴリーID。存在しないものは「すべて」にする
  const categories = await context.store.listLectureCategories();
  const categoryId = categories.some((category) => category.id === query.tab) ? query.tab : undefined;
  const view = await loadForPage(() => listLecturesForMember(context, actor, { categoryId, page: query.page }));
  const completed = new Set(view.completedLectureIds);
  const passed = new Set(view.passedLectureIds);
  const categoryName = new Map(view.categories.map((category) => [category.id, category.name]));

  return (
    <main data-page="lectures" data-state="ready" className="mx-auto max-w-3xl space-y-5 px-4 py-6">
      <h1 className="text-2xl font-bold">講義</h1>
      <QueryTabs
        basePath="/lectures"
        label="講義のカテゴリー"
        testIdPrefix="lecture-category"
        current={categoryId}
        tabs={[{ value: undefined, label: "すべて" }, ...view.categories.map((category) => ({ value: category.id, label: category.name }))]}
      />

      {view.access.status !== "available" ? <EntitlementNotice message={describeEntitlement(view.access)} testId="lectures-entitlement" /> : null}

      {view.page.items.length === 0 ? (
        <p className="text-muted-foreground" data-testid="lectures-empty">このカテゴリーの講義は、まだありません。ほかのカテゴリーも見てみよう。</p>
      ) : (
        <ul className="space-y-3" data-testid="lecture-list">
          {view.page.items.map((lecture) => (
            <li key={lecture.id}>
              <Link href={`/lectures/${lecture.id}`} data-testid="lecture-card" className="block rounded-lg border border-border p-4 hover:bg-muted">
                <p className="text-xs text-muted-foreground">{categoryName.get(lecture.categoryId) ?? ""}</p>
                <p className="mt-1 font-semibold">{lecture.title}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  {completed.has(lecture.id) ? <span className="rounded-full bg-success/10 px-2 py-0.5 font-semibold text-success">読みおわった</span> : null}
                  {passed.has(lecture.id) ? <span className="rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">クイズ合格</span> : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Pagination basePath="/lectures" page={view.page.page} pageSize={view.page.pageSize} total={view.page.total} extraQuery={{ tab: categoryId }} />
    </main>
  );
}
