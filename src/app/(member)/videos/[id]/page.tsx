import type { Metadata } from "next";
import Link from "next/link";
import { EntitlementNotice } from "@/components/entitlement-notice";
import { OutsideAppWarning } from "@/components/outside-app-warning";
import { VideoPlayer } from "@/components/video-player";
import { VIDEO_CATEGORY_LABELS, formatDuration } from "@/domain/learning";
import { describeEntitlement } from "@/domain/plans";
import { getServiceContext } from "@/server/current-actor";
import { loadForPage } from "@/server/page-errors";
import { requirePageActor } from "@/server/page-guards";
import { getVideoDetail } from "@/server/services/video-service";

export const metadata: Metadata = { title: "クラス動画" };

export default async function VideoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requirePageActor(["student", "guardian"], `/videos/${id}`);
  // ここで受け取るのは VideoSummary（配信元の秘密ID なし）。再生の許可はプレイヤーが POST でもらう
  const detail = await loadForPage(() => getVideoDetail(getServiceContext(), actor, id));
  const { video } = detail;

  return (
    <main data-page="video-detail" data-state="ready" className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <Link href={`/videos?tab=${video.category}`} className="text-sm font-semibold text-primary" data-testid="video-back">← {VIDEO_CATEGORY_LABELS[video.category]}の動画</Link>
      <div>
        <h1 className="text-2xl font-bold">{video.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{formatDuration(video.durationSeconds)}</p>
      </div>

      {video.viewableOutsideApp ? <OutsideAppWarning testId="video-outside-app-warning" /> : null}

      {detail.access.status === "available" ? (
        <VideoPlayer video={video} minimumWatchSeconds={detail.minimumWatchSeconds} canEarnPoints={detail.canEarnPoints} initiallyCompleted={detail.completed} />
      ) : (
        <EntitlementNotice message={describeEntitlement(detail.access)} testId="video-entitlement" />
      )}

      <p className="whitespace-pre-wrap text-sm leading-relaxed">{video.description}</p>
    </main>
  );
}
