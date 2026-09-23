import { describe, expect, it } from "vitest";
import { DEMO_IDS } from "@/data/seed/ids";
import { createTestContext } from "../../../test/service-context";
import { ServiceError } from "./errors";
import { awardForOwnAction, exchangePoints, getPointSummary, grantPoints } from "./points-service";

async function balanceOf(harness: ReturnType<typeof createTestContext>, userId: string) {
  const admin = await harness.actorOf(DEMO_IDS.admin);
  return (await getPointSummary(harness.context, admin, userId)).balance;
}

describe("ポイント付与（冪等）", () => {
  it("同じ idempotency_key で2回叩いても残高が変わらない", async () => {
    const harness = createTestContext();
    const student = await harness.actorOf(DEMO_IDS.student);
    const before = await balanceOf(harness, DEMO_IDS.student);

    expect(await awardForOwnAction(harness.context, student, { ruleCode: "lecture_completed", subject: "lecture-1" })).toEqual({ kind: "awarded", amount: 1 });
    expect(await awardForOwnAction(harness.context, student, { ruleCode: "lecture_completed", subject: "lecture-1" })).toEqual({ kind: "already_awarded" });
    expect(await balanceOf(harness, DEMO_IDS.student)).toBe(before + 1);
  });

  it("同時に叩いても日次上限（video_completed は3）を超えない", async () => {
    const harness = createTestContext();
    const student = await harness.actorOf(DEMO_IDS.student);
    const results = await Promise.all(
      ["a", "b", "c", "d", "e"].map((subject) => awardForOwnAction(harness.context, student, { ruleCode: "video_completed", subject: `video-${subject}` })),
    );
    expect(results.filter((result) => result.kind === "awarded")).toHaveLength(3);
    const limited = results.find((result) => result.kind === "daily_limit_reached");
    expect(limited && "message" in limited ? limited.message : "").toContain("また明日");
  });

  it("日次上限は JST の暦日で数える", async () => {
    const harness = createTestContext({ now: "2026-09-24T14:50:00.000Z" }); // JST 9/24 23:50
    const student = await harness.actorOf(DEMO_IDS.student);
    for (const subject of ["v1", "v2", "v3"]) await awardForOwnAction(harness.context, student, { ruleCode: "video_completed", subject });
    expect((await awardForOwnAction(harness.context, student, { ruleCode: "video_completed", subject: "v4" })).kind).toBe("daily_limit_reached");

    harness.setNow("2026-09-24T15:05:00.000Z"); // UTC ではまだ 9/24 だが、JST では 9/25 0:05
    expect((await awardForOwnAction(harness.context, student, { ruleCode: "video_completed", subject: "v4" })).kind).toBe("awarded");
  });

  it("生徒以外は「自分の行動」で付与を起こせない", async () => {
    const harness = createTestContext();
    const coach = await harness.actorOf(DEMO_IDS.coach);
    await expect(awardForOwnAction(harness.context, coach, { ruleCode: "login_daily", subject: "2026-09-24" })).rejects.toMatchObject({ code: "forbidden" });
    await expect(awardForOwnAction(harness.context, null, { ruleCode: "login_daily", subject: "2026-09-24" })).rejects.toMatchObject({ code: "unauthenticated" });
  });

  it("人が付与するルール（coach_bonus）は「自分の行動」経路では受け取れない", async () => {
    const harness = createTestContext();
    const student = await harness.actorOf(DEMO_IDS.student);
    await expect(awardForOwnAction(harness.context, student, { ruleCode: "coach_bonus", subject: "x" })).rejects.toBeInstanceOf(ServiceError);
  });
});

describe("コーチ・運営による付与", () => {
  const requestId = "0f8fad5b-d9cb-469f-a165-70867728950e";

  it("担当コーチは付与でき、監査ログが残る。同じフォームの二重送信は1回分", async () => {
    const harness = createTestContext();
    const coach = await harness.actorOf(DEMO_IDS.coach);
    const before = await balanceOf(harness, DEMO_IDS.student);
    const input = { studentId: DEMO_IDS.student, ruleCode: "coach_bonus" as const, amount: 5, requestId, note: "よくがんばった" };
    expect(await grantPoints(harness.context, coach, input)).toEqual({ kind: "awarded", amount: 5 });
    expect(await grantPoints(harness.context, coach, input)).toEqual({ kind: "already_awarded" });
    expect(await balanceOf(harness, DEMO_IDS.student)).toBe(before + 5);

    const audit = harness.state.auditLogs.filter((log) => log.action === "points.adjust");
    expect(audit).toHaveLength(1);
    // メモ（自由記述）は監査ログに書き写さない
    expect(JSON.stringify(audit)).not.toContain("よくがんばった");
  });

  it("担当外のコーチは付与できない", async () => {
    const harness = createTestContext();
    const otherCoach = await harness.actorOf(DEMO_IDS.coach2);
    await expect(grantPoints(harness.context, otherCoach, { studentId: DEMO_IDS.student, ruleCode: "coach_bonus", amount: 1, requestId })).rejects.toMatchObject({ code: "forbidden" });
  });

  it("生徒は自分にも付与できない", async () => {
    const harness = createTestContext();
    const student = await harness.actorOf(DEMO_IDS.student);
    await expect(grantPoints(harness.context, student, { studentId: DEMO_IDS.student, ruleCode: "coach_bonus", amount: 100, requestId })).rejects.toMatchObject({ code: "forbidden" });
  });
});

describe("残高の閲覧範囲", () => {
  it("保護者は紐づいた子だけ、生徒は自分だけ", async () => {
    const harness = createTestContext();
    const guardian = await harness.actorOf(DEMO_IDS.guardian);
    const student = await harness.actorOf(DEMO_IDS.student);
    await expect(getPointSummary(harness.context, guardian, DEMO_IDS.student)).resolves.toMatchObject({ balance: 4 });
    await expect(getPointSummary(harness.context, guardian, DEMO_IDS.student2)).rejects.toMatchObject({ code: "forbidden" });
    await expect(getPointSummary(harness.context, student, DEMO_IDS.student2)).rejects.toMatchObject({ code: "forbidden" });
  });
});

describe("交換", () => {
  it("残高が足りなければ、あと何ポイントかを伝える", async () => {
    const harness = createTestContext();
    const student = await harness.actorOf(DEMO_IDS.student);
    await expect(exchangePoints(harness.context, student, { itemId: "item-sticker", requestId: "r1" })).rejects.toMatchObject({
      code: "conflict",
      userMessage: expect.stringContaining("あと26ポイント"),
    });
  });

  it("交換すると残高と在庫が減り、同じリクエストの再送では減らない", async () => {
    const harness = createTestContext();
    const admin = await harness.actorOf(DEMO_IDS.admin);
    await grantPoints(harness.context, admin, { studentId: DEMO_IDS.student, ruleCode: "admin_adjustment", amount: 40, requestId: "7c9e6679-7425-40de-944b-e07fc1f90ae7" });
    const student = await harness.actorOf(DEMO_IDS.student);

    expect(await exchangePoints(harness.context, student, { itemId: "item-sticker", requestId: "r1" })).toMatchObject({ kind: "exchanged", cost: 30 });
    expect(await exchangePoints(harness.context, student, { itemId: "item-sticker", requestId: "r1" })).toEqual({ kind: "already_exchanged" });
    expect(await balanceOf(harness, DEMO_IDS.student)).toBe(4 + 40 - 30);
    expect(harness.state.exchangeItems.find((item) => item.id === "item-sticker")?.stock).toBe(19);
  });

  it("在庫が無ければ断る", async () => {
    const harness = createTestContext();
    const sticker = harness.state.exchangeItems.find((item) => item.id === "item-sticker");
    if (sticker) sticker.stock = 0;
    const student = await harness.actorOf(DEMO_IDS.student);
    await expect(exchangePoints(harness.context, student, { itemId: "item-sticker", requestId: "r1" })).rejects.toMatchObject({ userMessage: expect.stringContaining("在庫") });
  });
});
