import { describe, expect, it } from "vitest";
import { checkViewCompletion, describeCompletionCheck, formatDuration, minimumLectureReadSeconds, minimumVideoWatchSeconds } from "./learning";
import type { ViewSession } from "./types";

const session: ViewSession = { id: "s1", userId: "u1", kind: "video", targetId: "v1", startedAt: "2026-09-24T00:00:00.000Z" };

describe("視聴・読了の完了判定", () => {
  it("動画は長さの8割（最低10秒）", () => {
    expect(minimumVideoWatchSeconds(300)).toBe(240);
    expect(minimumVideoWatchSeconds(5)).toBe(10);
  });
  it("講義は文字数から 15秒〜180秒", () => {
    expect(minimumLectureReadSeconds({ body: "あ".repeat(12) })).toBe(15);
    expect(minimumLectureReadSeconds({ body: "あ".repeat(600) })).toBe(50);
    expect(minimumLectureReadSeconds({ body: "あ".repeat(10_000) })).toBe(180);
  });
  it("開始から最低時間が経っていなければ、あと何秒かを返す", () => {
    const check = checkViewCompletion({ session, userId: "u1", kind: "video", targetId: "v1", minimumSeconds: 240, now: new Date("2026-09-24T00:03:00.000Z") });
    expect(check).toEqual({ ok: false, reason: "too_early", waitSeconds: 60 });
    expect(describeCompletionCheck(check, "video")).toContain("あと1分");
  });
  it("経っていれば完了", () => {
    expect(checkViewCompletion({ session, userId: "u1", kind: "video", targetId: "v1", minimumSeconds: 240, now: new Date("2026-09-24T00:04:00.000Z") })).toEqual({ ok: true });
  });
  it("他人のセッション・別の動画のセッションは使えない", () => {
    const now = new Date("2026-09-25T00:00:00.000Z");
    expect(checkViewCompletion({ session, userId: "u2", kind: "video", targetId: "v1", minimumSeconds: 1, now }).ok).toBe(false);
    expect(checkViewCompletion({ session, userId: "u1", kind: "video", targetId: "v2", minimumSeconds: 1, now }).ok).toBe(false);
    expect(checkViewCompletion({ session, userId: "u1", kind: "lecture", targetId: "v1", minimumSeconds: 1, now }).ok).toBe(false);
    expect(checkViewCompletion({ session: null, userId: "u1", kind: "video", targetId: "v1", minimumSeconds: 1, now }).ok).toBe(false);
  });
  it("時間の表示", () => {
    expect(formatDuration(420)).toBe("7:00");
    expect(formatDuration(65)).toBe("1:05");
  });
});
