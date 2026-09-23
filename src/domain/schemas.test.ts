import { describe, expect, it } from "vitest";
import { listQuerySchema, memberCreateSchema, videoCreateSchema } from "./schemas";

describe("動画登録スキーマ", () => {
  const base = { title: "パスの前にみる", description: "", category: "soccer_iq", durationSeconds: "120" };
  it("YouTube は「外でも見られる」の確認が無いと通らない", () => {
    const result = videoCreateSchema.safeParse({ ...base, source: "youtube", youtubeId: "dQw4w9WgXcQ" });
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain("アプリの外でも見られます");
    expect(videoCreateSchema.safeParse({ ...base, source: "youtube", youtubeId: "dQw4w9WgXcQ", acknowledgedPublicExposure: true }).success).toBe(true);
  });
  it("YouTube の URL をそのまま入れたら、ID の取り出し方を案内する", () => {
    const result = videoCreateSchema.safeParse({ ...base, source: "youtube", youtubeId: "https://youtu.be/dQw4w9WgXcQ", acknowledgedPublicExposure: true });
    expect(JSON.stringify(result.error?.issues)).toContain("v= のあと");
  });
  it("配信元ごとに必要な項目を要求する", () => {
    expect(videoCreateSchema.safeParse({ ...base, source: "upload" }).success).toBe(false);
    expect(videoCreateSchema.safeParse({ ...base, source: "upload", storageKey: "videos/a.mp4" }).success).toBe(true);
    expect(videoCreateSchema.safeParse({ ...base, source: "mux", muxPlaybackId: "abcDEF0123456" }).success).toBe(true);
  });
});

describe("会員追加スキーマ", () => {
  it("メールを正規化し、表示名に < > を許さない", () => {
    const ok = memberCreateSchema.parse({ displayName: "ヒカリ", fullName: "架空 ひかり", email: " Test@Example.COM ", role: "student", planCode: "light", ageBand: null });
    expect(ok.email).toBe("test@example.com");
    expect(memberCreateSchema.safeParse({ displayName: "<b>x</b>", fullName: "x", email: "a@example.com", role: "student", planCode: null, ageBand: null }).success).toBe(false);
  });
});

describe("一覧クエリ", () => {
  it("壊れた ?page= は 1 に戻す", () => {
    expect(listQuerySchema.parse({ page: "abc" }).page).toBe(1);
    expect(listQuerySchema.parse({ page: "-3" }).page).toBe(1);
    expect(listQuerySchema.parse({ page: "2", tab: "mentality" })).toEqual({ page: 2, tab: "mentality" });
  });
});
