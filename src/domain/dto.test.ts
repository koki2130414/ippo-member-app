import { describe, expect, it } from "vitest";
import { toChatMessageView, toDiagnosisQuestionPublic, toQuizQuestionPublic, toSoccerNoteView, toVideoReviewView, toVideoSummary } from "./dto";
import type { Video } from "./types";

/** JSON にしたときにキーが出てこないこと。RSC/HTML に載るのは結局シリアライズ後の文字列なので、そこで確かめる */
function serialized(value: unknown): string {
  return JSON.stringify(value);
}

const baseVideo: Video = {
  id: "v1", title: "t", description: "d", category: "soccer_iq", durationSeconds: 60,
  source: "mux", storageKey: "videos/secret.mp4", muxPlaybackId: "SECRETPLAYBACKID123", youtubeId: null,
  publishedAt: "2026-09-01T00:00:00Z", createdBy: "admin-1",
};

describe("DTO から秘密フィールドが落ちている", () => {
  it("動画: playbackId と storageKey の値もキーも出ない", () => {
    const text = serialized(toVideoSummary(baseVideo));
    expect(text).not.toContain('"muxPlaybackId":');
    expect(text).not.toContain('"storageKey":');
    expect(text).not.toContain("SECRETPLAYBACKID123");
    expect(text).not.toContain("videos/secret.mp4");
  });

  it("動画: YouTube だけは ID を渡し、外でも見られることを示す", () => {
    const youtube = toVideoSummary({ ...baseVideo, source: "youtube", youtubeId: "dQw4w9WgXcQ", muxPlaybackId: null, storageKey: null });
    expect(youtube).toMatchObject({ youtubeId: "dQw4w9WgXcQ", viewableOutsideApp: true });
    // 配信元が YouTube 以外なら、データに youtubeId が紛れていても渡さない
    expect(toVideoSummary({ ...baseVideo, youtubeId: "dQw4w9WgXcQ" }).youtubeId).toBeNull();
  });

  it("クイズ: 正解フラグと解説を送信前に渡さない", () => {
    const text = serialized(toQuizQuestionPublic({
      id: "q1", lectureId: "l1", prompt: "p", explanation: "SECRET_EXPLANATION",
      choices: [{ id: "c1", label: "a", isCorrect: true }, { id: "c2", label: "b", isCorrect: false }],
    }));
    expect(text).not.toContain("isCorrect");
    expect(text).not.toContain("SECRET_EXPLANATION");
  });

  it("診断: 正解フラグを渡さない", () => {
    const text = serialized(toDiagnosisQuestionPublic({
      id: "q1", diagnosisId: "d1", categoryCode: "c", prompt: "p", sortOrder: 1,
      choices: [{ id: "c1", label: "a", isCorrect: true }],
    }));
    expect(text).not.toContain("isCorrect");
  });

  it("ノート・動画レビュー: ストレージのパスを渡さない", () => {
    const common = { id: "n1", studentId: "s1", studentComment: "", coachId: null, coachReply: null, submittedAt: "2026-09-01T00:00:00Z", repliedAt: null };
    expect(serialized(toSoccerNoteView({ ...common, photoStorageKey: "soccer-notes/s1/x.jpg" }))).not.toContain("soccer-notes/");
    expect(serialized(toVideoReviewView({ ...common, storageKey: "reviews/s1/x.mp4" }))).not.toContain("reviews/");
  });

  it("チャット: 削除・非表示の本文は空にする", () => {
    const base = { id: "m1", roomId: "r1", authorId: "u1", body: "SECRET_BODY", createdAt: "2026-09-01T00:00:00Z", editedAt: null, deletedAt: null, hiddenAt: null };
    expect(toChatMessageView(base)).toMatchObject({ state: "visible", body: "SECRET_BODY" });
    expect(toChatMessageView({ ...base, deletedAt: "2026-09-02T00:00:00Z" })).toMatchObject({ state: "deleted", body: "" });
    expect(toChatMessageView({ ...base, hiddenAt: "2026-09-02T00:00:00Z" })).toMatchObject({ state: "hidden", body: "" });
  });
});

describe("型レベルの保証", () => {
  it("PublicProfile に fullName は存在しない", () => {
    // @ts-expect-error fullName は PublicProfile に無い（型から消えていることをコンパイル時に確かめる）
    const probe: import("./types").PublicProfile["fullName"] = "x";
    expect(probe).toBe("x");
  });
  it("QuizChoicePublic に isCorrect は存在しない", () => {
    // @ts-expect-error isCorrect はクライアント用の型に無い
    const probe: import("./dto").QuizChoicePublic["isCorrect"] = true;
    expect(probe).toBe(true);
  });
});
