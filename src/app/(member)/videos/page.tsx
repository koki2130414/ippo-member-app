import type { Metadata } from "next";
import Link from "next/link";
import { EntitlementNotice } from "@/components/entitlement-notice";
import { Pagination } from "@/components/pagination";
import { QueryTabs } from "@/components/query-tabs";
import { VIDEO_CATEGORY_LABELS, formatDuration } from "@/domain/learning";
import { describeEntitlement } from "@/domain/plans";
import { listQuerySchema } from "@/domain/schemas";
import { VIDEO_CATEGORIES, type VideoCategory } from "@/domain/types";
import { getServiceContext } from "@/server/current-actor";
import { loadForPage } from "@/server/page-errors";
import { requirePageActor } from "@/server/page-guards";
import { listVideosForMember } from "@/server/services/video-service";

export const metadata: Metadata = { title: "クラス動画" };

function parseCategory(value: string | undefined): VideoCategory | undefined {
  return VIDEO_CATEGORIES.find((category) => category === value);
}

export default async function VideosPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const actor = await requirePageActor(["student", "guardian"], "/videos");
  const query = listQuerySchema.parse(await searchParams);
  // 知らないタブ名は「すべて」として扱う（URL は誰でも書き換えられるので）
  const category = parseCategory(query.tab);
  const view = await loadForPage(() => listVideosForMember(getServiceContext(), actor, { category, page: query.page }));
  const completed = new Set(view.completedVideoIds);

  return (
    <main data-page="videos" data-state="ready" className="mx-auto max-w-3xl space-y-5 px-4 py-6">
      <h1 className="text-2xl font-bold">クラス動画</h1>
      <QueryTabs
        basePath="/videos"
        label="動画のカテゴリー"
        testIdPrefix="video-category"
        current={category}
        tabs={[{ value: undefined, label: "すべて" }, ...VIDEO_CATEGORIES.map((value) => ({ value, label: VIDEO_CATEGORY_LABELS[value] }))]}
      />

      {view.access.status !== "available" ? <EntitlementNotice message={describeEntitlement(view.access)} testId="videos-entitlement" /> : null}

      {view.page.items.length === 0 ? (
        <p className="text-muted-foreground" data-testid="videos-empty">このカテゴリーの動画は、まだありません。ほかのカテゴリーも見てみよう。</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2" data-testid="video-list">
          {view.page.items.map((video) => (
            <li key={video.id}>
              <Link href={`/videos/${video.id}`} data-testid="video-card" className="block h-full rounded-lg border border-border p-4 hover:bg-muted">
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>{VIDEO_CATEGORY_LABELS[video.category]}</span>
                  <span>{formatDuration(video.durationSeconds)}</span>
                </div>
                <p className="mt-1 font-semibold">{video.title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{video.description}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  {completed.has(video.id) ? <span className="rounded-full bg-success/10 px-2 py-0.5 font-semibold text-success">見おわった</span> : null}
                  {video.viewableOutsideApp ? <span className="rounded-full bg-destructive/10 px-2 py-0.5 font-semibold text-destructive">YouTube（外でも見られます）</span> : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Pagination basePath="/videos" page={view.page.page} pageSize={view.page.pageSize} total={view.page.total} extraQuery={{ tab: category }} />
    </main>
  );
}
