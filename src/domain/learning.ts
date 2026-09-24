import type { Lecture, VideoCategory, ViewSession } from "./types";

/**
 * 動画・講義の「完了」の判定。
 *
 * 完了はポイントにつながるので、「見終わった」ボタンを押しただけでは認めない。
 * サーバーが持っている開始時刻から、最低限の時間が経っていることを確かめる。
 * これは「ちゃんと見た」ことの証明ではなく、連打や自動化でポイントを稼ぐのを防ぐための下限。
 */

export const VIDEO_CATEGORY_LABELS: Record<VideoCategory, string> = {
  soccer_iq: "サッカーIQ",
  mentality: "メンタリティ",
  fitness: "フィットネス",
  other: "その他",
};

/** 動画は長さの 8 割。早送りや、少し飛ばして見るのは許す */
export function minimumVideoWatchSeconds(durationSeconds: number): number {
  return Math.max(10, Math.floor(durationSeconds * 0.8));
}

/**
 * 講義は文字数から「ざっと読める時間」を出す。
 * 小学生でも無理のない速さ（1秒に12文字）にし、短すぎる・長すぎる講義は 15秒〜3分に収める。
 */
export function minimumLectureReadSeconds(lecture: Pick<Lecture, "body">): number {
  const characters = [...lecture.body.replace(/\s/g, "")].length;
  return Math.min(180, Math.max(15, Math.ceil(characters / 12)));
}

export type CompletionCheck = { ok: true } | { ok: false; reason: "no_session" | "wrong_target" | "too_early"; waitSeconds: number };

export function checkViewCompletion(input: {
  session: ViewSession | null;
  userId: string;
  kind: ViewSession["kind"];
  targetId: string;
  minimumSeconds: number;
  now: Date;
}): CompletionCheck {
  const { session, userId, kind, targetId, minimumSeconds, now } = input;
  if (!session) return { ok: false, reason: "no_session", waitSeconds: minimumSeconds };
  // 他人の・別の動画のセッションを使い回させない
  if (session.userId !== userId || session.kind !== kind || session.targetId !== targetId) {
    return { ok: false, reason: "wrong_target", waitSeconds: minimumSeconds };
  }
  const elapsedSeconds = (now.getTime() - new Date(session.startedAt).getTime()) / 1000;
  if (elapsedSeconds < minimumSeconds) {
    return { ok: false, reason: "too_early", waitSeconds: Math.ceil(minimumSeconds - elapsedSeconds) };
  }
  return { ok: true };
}

/** 子ども向けの文言。責めずに、あとどれくらいかを伝える */
export function describeCompletionCheck(check: CompletionCheck, kind: ViewSession["kind"]): string | null {
  if (check.ok) return null;
  const verb = kind === "video" ? "見て" : "読んで";
  if (check.reason === "too_early") {
    const minutes = Math.floor(check.waitSeconds / 60);
    const seconds = check.waitSeconds % 60;
    const wait = minutes > 0 ? `${minutes}分${seconds > 0 ? `${seconds}秒` : ""}` : `${seconds}秒`;
    return `もう少し${verb}みよう。あと${wait}くらいで「おわった」にできるよ`;
  }
  return kind === "video" ? "さいしょに再生ボタンをおしてから見てみよう" : "ページを開きなおしてから、もう一度ためしてみよう";
}

export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
