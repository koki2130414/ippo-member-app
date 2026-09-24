import { toVideoSummary, type PlaybackGrant, type VideoSummary } from "@/domain/dto";
import { checkViewCompletion, describeCompletionCheck, minimumVideoWatchSeconds } from "@/domain/learning";
import type { Entitlement } from "@/domain/plans";
import type { Actor, VideoCategory } from "@/domain/types";
import type { Page } from "@/data/data-store";
import { evaluateAccess } from "./access";
import type { ServiceContext } from "./context";
import { ServiceError, invalid, notFound } from "./errors";
import { requireRole } from "./guards";
import { signMuxPlaybackToken } from "./mux-signing";
import { awardForOwnAction, type AwardOutcome } from "./points-service";

/**
 * クラス動画のサービス層。
 * 画面へ返すのは VideoSummary（配信元の秘密IDを落とした形）だけ。
 * 再生に必要な情報（署名URL・playbackId・トークン）は startPlayback の戻り値でだけ返し、
 * それは Server Action（POST）のレスポンスにしか載らない。
 */

const MEMBER_ROLES = ["student", "guardian"] as const;
export const VIDEO_PAGE_SIZE = 12;

export interface VideoListView {
  page: Page<VideoSummary>;
  completedVideoIds: string[];
  access: Entitlement;
}

export async function listVideosForMember(
  context: ServiceContext,
  actor: Actor | null,
  query: { category: VideoCategory | undefined; page: number },
): Promise<VideoListView> {
  const member = requireRole(actor, MEMBER_ROLES, "video.list");
  const [page, access, progress] = await Promise.all([
    context.store.listVideos({ category: query.category, page: query.page, pageSize: VIDEO_PAGE_SIZE, publishedOnly: true }),
    evaluateAccess(context, member, "classVideos"),
    member.role === "student" ? context.store.listVideoProgress(member.userId) : Promise.resolve([]),
  ]);
  return {
    page: { ...page, items: page.items.map(toVideoSummary) },
    completedVideoIds: progress.filter((item) => item.completedAt !== null).map((item) => item.videoId),
    access,
  };
}

export interface VideoDetailView {
  video: VideoSummary;
  completed: boolean;
  minimumWatchSeconds: number;
  access: Entitlement;
  canEarnPoints: boolean;
}

export async function getVideoDetail(context: ServiceContext, actor: Actor | null, videoId: string): Promise<VideoDetailView> {
  const member = requireRole(actor, MEMBER_ROLES, "video.detail");
  const video = await context.store.getVideo(videoId);
  // 未公開の動画は「無い」と同じに扱う（存在を知らせない）
  if (!video || video.publishedAt === null) throw notFound("video.detail");
  const [access, progress] = await Promise.all([
    evaluateAccess(context, member, "classVideos"),
    member.role === "student" ? context.store.getVideoProgress(member.userId, videoId) : Promise.resolve(null),
  ]);
  return {
    video: toVideoSummary(video),
    completed: progress?.completedAt != null,
    minimumWatchSeconds: minimumVideoWatchSeconds(video.durationSeconds),
    access,
    canEarnPoints: member.role === "student",
  };
}

export interface StartPlaybackResult {
  grant: PlaybackGrant;
  /** 視聴完了の判定に使う。生徒のときだけ発行する */
  viewSessionId: string | null;
}

export async function startPlayback(context: ServiceContext, actor: Actor | null, videoId: string): Promise<StartPlaybackResult> {
  const member = requireRole(actor, MEMBER_ROLES, "video.play");
  const video = await context.store.getVideo(videoId);
  if (!video || video.publishedAt === null) throw notFound("video.play");

  // 会員権限の確認は、再生の直前にサーバーで必ず行う（画面で再生ボタンを隠していても）
  const access = await evaluateAccess(context, member, "classVideos");
  if (access.status !== "available") {
    throw new ServiceError("forbidden", access.status === "no_plan" ? "プランに加入すると見られます。プランのページを見てみよう" : "この動画は今のプランでは見られません", `video.play:${access.status}`);
  }

  const now = context.now();
  let viewSessionId: string | null = null;
  if (member.role === "student") {
    viewSessionId = context.newId();
    await context.store.createViewSession({ id: viewSessionId, userId: member.userId, kind: "video", targetId: video.id, startedAt: now.toISOString() });
  }

  switch (video.source) {
    case "youtube":
      if (!video.youtubeId) throw invalid("この動画は準備中です。運営に知らせてください", "video.play:youtube_missing_id");
      return { grant: { kind: "youtube", youtubeId: video.youtubeId }, viewSessionId };
    case "mux": {
      if (!video.muxPlaybackId) throw invalid("この動画は準備中です。運営に知らせてください", "video.play:mux_missing_id");
      if (!context.media.muxSigningKey) return { grant: { kind: "demo", reason: "no_mux_key" }, viewSessionId };
      const signed = signMuxPlaybackToken(video.muxPlaybackId, context.media.muxSigningKey, now);
      return { grant: { kind: "mux", playbackId: video.muxPlaybackId, token: signed.token, expiresAt: signed.expiresAt.toISOString() }, viewSessionId };
    }
    case "upload":
      if (!video.storageKey) throw invalid("この動画は準備中です。運営に知らせてください", "video.play:upload_missing_key");
      if (!context.media.storageAvailable) return { grant: { kind: "demo", reason: "no_storage" }, viewSessionId };
      // Supabase Storage の署名URL は Phase 6 で実装する。ここに来たら設定の不整合なので止める
      throw invalid("動画を再生できませんでした。時間をおいてもう一度ためしてください", "video.play:storage_not_implemented");
  }
}

export type CompleteVideoResult = { kind: "completed"; points: AwardOutcome } | { kind: "already_completed" };

/** 視聴完了。再生を始めてから長さの8割の時間が経っていることを、サーバーの時計で確かめる */
export async function completeVideo(context: ServiceContext, actor: Actor | null, input: { videoId: string; viewSessionId: string }): Promise<CompleteVideoResult> {
  const student = requireRole(actor, ["student"], "video.complete");
  const video = await context.store.getVideo(input.videoId);
  if (!video || video.publishedAt === null) throw notFound("video.complete");

  const minimumSeconds = minimumVideoWatchSeconds(video.durationSeconds);
  const check = checkViewCompletion({
    session: await context.store.getViewSession(input.viewSessionId),
    userId: student.userId,
    kind: "video",
    targetId: video.id,
    minimumSeconds,
    now: context.now(),
  });
  const message = describeCompletionCheck(check, "video");
  if (message !== null) throw invalid(message, "video.complete:check");

  const { firstTime } = await context.store.markVideoCompleted({
    userId: student.userId,
    videoId: video.id,
    watchedSeconds: video.durationSeconds,
    completedAt: context.now().toISOString(),
  });
  if (!firstTime) return { kind: "already_completed" };
  const points = await awardForOwnAction(context, student, { ruleCode: "video_completed", subject: video.id });
  return { kind: "completed", points };
}
