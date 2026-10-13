import type { Metadata } from "next";
import Link from "next/link";
import { Pagination } from "@/components/pagination";
import { QueryTabs } from "@/components/query-tabs";
import { VideoInstructorsEditor } from "@/components/video-instructors-editor";
import { VIDEO_CATEGORY_LABELS } from "@/domain/learning";
import { listQuerySchema } from "@/domain/schemas";
import { getServiceContext } from "@/server/current-actor";
import { loadForPage } from "@/server/page-errors";
import { requirePageActor } from "@/server/page-guards";
import { listVideosForAdmin } from "@/server/services/video-service";

export const metadata: Metadata = { title: "クラス動画の管理" };

export default async function AdminVideosPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const actor = await requirePageActor(["admin"], "/admin/videos");
  const query = listQuerySchema.parse(await searchParams);
  const view = await loadForPage(() => listVideosForAdmin(getServiceContext(), actor, { page: query.page, instructor: query.coach }));
  const suggestions = view.instructors.map((item) => item.name);

  return (
    <main data-page="admin-videos" data-state="ready" className="mx-auto max-w-3xl space-y-5 px-4 py-6">
      <div>
        <h1 className="text-2xl font-bold">クラス動画の管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          それぞれのクラスを担当したコーチを入れると、会員の「クラス動画」でコーチ別に見られるようになります。呼び名は表記をそろえてください（「荒木コーチ」と「げんちコーチ」は別の人として扱われます）。
        </p>
      </div>

      {view.instructors.length > 0 ? (
        <QueryTabs
          basePath="/admin/videos"
          label="担当コーチ"
          testIdPrefix="admin-video-coach"
          param="coach"
          current={query.coach}
          tabs={[{ value: undefined, label: "すべて" }, ...view.instructors.map((item) => ({ value: item.name, label: `${item.name}（${item.count}）` }))]}
        />
      ) : null}

      <ul className="space-y-3" data-testid="admin-video-list">
        {view.page.items.map((video) => (
          <li key={video.id} className="space-y-2 rounded-lg border border-border p-4" data-testid="admin-video-row">
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>{VIDEO_CATEGORY_LABELS[video.category]}</span>
              <span>{video.publishedAt ? new Date(video.publishedAt).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" }) : "未公開"}</span>
            </div>
            <Link href={`/videos/${video.id}`} className="block font-semibold hover:underline">{video.title}</Link>
            <VideoInstructorsEditor videoId={video.id} initial={video.instructors} suggestions={suggestions} />
          </li>
        ))}
      </ul>

      <Pagination basePath="/admin/videos" page={view.page.page} pageSize={view.page.pageSize} total={view.page.total} extraQuery={{ coach: query.coach }} />
    </main>
  );
}
