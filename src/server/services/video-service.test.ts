import { generateKeyPairSync, createVerify } from "node:crypto";
import { describe, expect, it } from "vitest";
import { DEMO_IDS } from "@/data/seed/ids";
import { createTestContext } from "../../../test/service-context";
import { completeVideo, getVideoDetail, listVideosForMember, startPlayback } from "./video-service";

describe("動画の一覧と詳細", () => {
  it("一覧・詳細は VideoSummary だけを返す（秘密のキーが無い）", async () => {
    const harness = createTestContext();
    const student = await harness.actorOf(DEMO_IDS.student);
    const list = await listVideosForMember(harness.context, student, { category: undefined, page: 1 });
    const detail = await getVideoDetail(harness.context, student, "video-sample-mux");
    const text = JSON.stringify({ list, detail });
    expect(text).not.toContain("muxPlaybackId");
    expect(text).not.toContain("storageKey");
    expect(text).not.toContain("SampleSignedPlaybackId");
    expect(list.page.items.length).toBeGreaterThan(0);
  });

  it("カテゴリーで絞りこめる", async () => {
    const harness = createTestContext();
    const student = await harness.actorOf(DEMO_IDS.student);
    const list = await listVideosForMember(harness.context, student, { category: "fitness", page: 1 });
    expect(list.page.items.every((video) => video.category === "fitness")).toBe(true);
  });

  it("コーチは会員向けの動画画面を使えない", async () => {
    const harness = createTestContext();
    await expect(listVideosForMember(harness.context, await harness.actorOf(DEMO_IDS.coach), { category: undefined, page: 1 })).rejects.toMatchObject({ code: "forbidden" });
  });

  it("運営は会員と同じ動画を見られるが、記録もポイントもつかない", async () => {
    const harness = createTestContext();
    const admin = await harness.actorOf(DEMO_IDS.admin);
    const list = await listVideosForMember(harness.context, admin, { category: undefined, page: 1 });
    expect(list.access.status).toBe("available");
    expect(list.page.items.length).toBeGreaterThan(0);
    const detail = await getVideoDetail(harness.context, admin, "video-sample-mux");
    expect(detail.canEarnPoints).toBe(false);
    const playback = await startPlayback(harness.context, admin, "video-sample-mux");
    expect(playback.viewSessionId).toBeNull();
    await expect(completeVideo(harness.context, admin, { videoId: "video-sample-mux", viewSessionId: "any" })).rejects.toMatchObject({ code: "forbidden" });
    expect(harness.state.pointTransactions.filter((transaction) => transaction.userId === DEMO_IDS.admin)).toHaveLength(0);
  });

  it("未公開の動画は存在しない扱い", async () => {
    const harness = createTestContext();
    const video = harness.state.videos.find((item) => item.id === "video-sample-mux");
    if (video) video.publishedAt = null;
    await expect(getVideoDetail(harness.context, await harness.actorOf(DEMO_IDS.student), "video-sample-mux")).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("再生の許可", () => {
  it("未加入の生徒には再生させず、加入をすすめる", async () => {
    const harness = createTestContext();
    harness.state.memberships = harness.state.memberships.filter((membership) => membership.userId !== DEMO_IDS.student3);
    const student = await harness.actorOf(DEMO_IDS.student3);
    const detail = await getVideoDetail(harness.context, student, "video-sample-upload");
    expect(detail.access.status).toBe("no_plan");
    await expect(startPlayback(harness.context, student, "video-sample-upload")).rejects.toMatchObject({ code: "forbidden", userMessage: expect.stringContaining("プランに加入") });
  });

  it("デモモードでは、アップロード動画・鍵の無い Mux はデモ再生にする", async () => {
    const harness = createTestContext();
    const student = await harness.actorOf(DEMO_IDS.student);
    expect((await startPlayback(harness.context, student, "video-sample-upload")).grant).toEqual({ kind: "demo", reason: "no_storage" });
    expect((await startPlayback(harness.context, student, "video-sample-mux")).grant).toEqual({ kind: "demo", reason: "no_mux_key" });
  });

  it("YouTube は ID を返す", async () => {
    const harness = createTestContext();
    const result = await startPlayback(harness.context, await harness.actorOf(DEMO_IDS.student), "video-sample-youtube");
    expect(result.grant).toEqual({ kind: "youtube", youtubeId: "M7lc1UVf-VE" });
  });

  it("Mux の鍵があれば、期限つきの署名トークンを返す（署名は公開鍵で検証できる）", async () => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const harness = createTestContext();
    harness.context.media.muxSigningKey = { keyId: "test-key", privateKeyBase64: Buffer.from(privateKey.export({ type: "pkcs8", format: "pem" })).toString("base64") };
    const result = await startPlayback(harness.context, await harness.actorOf(DEMO_IDS.student), "video-sample-mux");
    if (result.grant.kind !== "mux") throw new Error("mux の許可が返っていない");
    const [header, payload, signature] = result.grant.token.split(".");
    const verifier = createVerify("RSA-SHA256");
    verifier.update(`${header}.${payload}`);
    expect(verifier.verify(publicKey, Buffer.from(signature ?? "", "base64url"))).toBe(true);
    const claims: unknown = JSON.parse(Buffer.from(payload ?? "", "base64url").toString());
    expect(claims).toMatchObject({ sub: "SampleSignedPlaybackId0001", aud: "v", kid: "test-key" });
    // 有効期限は 10 分
    expect(new Date(result.grant.expiresAt).getTime() - harness.context.now().getTime()).toBe(10 * 60 * 1000);
  });

  it("保護者は、子がプランに入っていれば再生できる（視聴記録は作らない）", async () => {
    const harness = createTestContext();
    const result = await startPlayback(harness.context, await harness.actorOf(DEMO_IDS.guardian), "video-sample-upload");
    expect(result.viewSessionId).toBeNull();
    expect(harness.state.viewSessions).toHaveLength(0);
  });
});

describe("視聴完了", () => {
  it("長さの8割が経つ前は完了にせず、経てば1回だけポイントが付く", async () => {
    const harness = createTestContext({ now: "2026-09-24T03:00:00.000Z" });
    const student = await harness.actorOf(DEMO_IDS.student);
    const { viewSessionId } = await startPlayback(harness.context, student, "video-sample-scan"); // 300秒 → 240秒
    if (!viewSessionId) throw new Error("session");

    harness.setNow("2026-09-24T03:03:00.000Z");
    await expect(completeVideo(harness.context, student, { videoId: "video-sample-scan", viewSessionId })).rejects.toMatchObject({ userMessage: expect.stringContaining("あと1分") });

    harness.setNow("2026-09-24T03:04:00.000Z");
    const before = harness.state.pointTransactions.length;
    expect(await completeVideo(harness.context, student, { videoId: "video-sample-scan", viewSessionId })).toEqual({ kind: "completed", points: { kind: "awarded", amount: 1 } });
    expect(await completeVideo(harness.context, student, { videoId: "video-sample-scan", viewSessionId })).toEqual({ kind: "already_completed" });
    expect(harness.state.pointTransactions.length).toBe(before + 1);
  });

  it("他人の視聴セッションや別の動画のセッションでは完了にできない", async () => {
    const harness = createTestContext({ now: "2026-09-24T03:00:00.000Z" });
    const student = await harness.actorOf(DEMO_IDS.student);
    const other = await harness.actorOf(DEMO_IDS.student2);
    const { viewSessionId } = await startPlayback(harness.context, student, "video-sample-scan");
    if (!viewSessionId) throw new Error("session");
    harness.setNow("2026-09-25T00:00:00.000Z");
    await expect(completeVideo(harness.context, other, { videoId: "video-sample-scan", viewSessionId })).rejects.toMatchObject({ code: "invalid" });
    await expect(completeVideo(harness.context, student, { videoId: "video-sample-stretch", viewSessionId })).rejects.toMatchObject({ code: "invalid" });
  });
});

describe("見学モード（見学用アカウント）", () => {
  it("動画の一覧と再生はできるが、視聴記録もポイントも作らない", async () => {
    const harness = createTestContext({ seed: "empty" });
    const guest = await harness.actorOf(DEMO_IDS.guest);
    const list = await listVideosForMember(harness.context, guest, { category: undefined, page: 1 });
    expect(list.access.status).toBe("available");
    expect(list.page.total).toBe(42);

    const videoId = list.page.items[0]?.id ?? "";
    expect((await getVideoDetail(harness.context, guest, videoId)).canEarnPoints).toBe(false);
    const playback = await startPlayback(harness.context, guest, videoId);
    expect(playback.grant.kind).toBe("youtube");
    expect(playback.viewSessionId).toBeNull();
    await expect(completeVideo(harness.context, guest, { videoId, viewSessionId: "any" })).rejects.toMatchObject({ userMessage: expect.stringContaining("見学中") });
    expect(harness.state.pointTransactions).toHaveLength(0);
  });

  it("見学用アカウントは運営の画面には入れない（ロールは生徒）", async () => {
    const harness = createTestContext({ seed: "empty" });
    expect((await harness.actorOf(DEMO_IDS.guest)).role).toBe("student");
  });
});
