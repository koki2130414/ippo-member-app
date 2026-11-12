import { describe, expect, it } from "vitest";
import { DEMO_IDS } from "@/data/seed/ids";
import { reportRange } from "@/domain/karte";
import { createTestContext } from "../../../test/service-context";
import { addKarteAction, addKarteEntry, deleteKarteEntry, getKarte, getKarteReport, listKarteStudents, saveKarteGoal } from "./karte-service";

const NOW = "2026-11-12T03:00:00.000Z";

describe("カルテを見る", () => {
  it("本人には面談メモが出ず、担当コーチと運営には出る", async () => {
    const harness = createTestContext({ now: NOW });
    const student = await getKarte(harness.context, await harness.actorOf(DEMO_IDS.student));
    expect(student.entries.some((entry) => entry.kind === "interview")).toBe(false);
    expect(student.can.writeKinds).toEqual(["practice", "reflection"]);
    expect(student.followUp).toBeNull();

    const coach = await getKarte(harness.context, await harness.actorOf(DEMO_IDS.coach), DEMO_IDS.student);
    expect(coach.entries.some((entry) => entry.kind === "interview")).toBe(true);
    expect(coach.can.seeStaffOnly).toBe(true);
    const admin = await getKarte(harness.context, await harness.actorOf(DEMO_IDS.admin), DEMO_IDS.student);
    expect(admin.entries.some((entry) => entry.kind === "interview")).toBe(true);
  });

  it("保護者は紐づいた子だけ、面談メモなし、書けない", async () => {
    const harness = createTestContext({ now: NOW });
    const guardian = await harness.actorOf(DEMO_IDS.guardian);
    const view = await getKarte(harness.context, guardian);
    expect(view.student.userId).toBe(DEMO_IDS.student);
    expect(view.entries.some((entry) => entry.kind === "interview")).toBe(false);
    expect(view.can).toMatchObject({ writeGoal: false, writeKinds: [] });
    await expect(getKarte(harness.context, guardian, DEMO_IDS.student2)).resolves.toMatchObject({ student: { userId: DEMO_IDS.student } });
  });

  it("担当でないコーチ・他の生徒は見られない", async () => {
    const harness = createTestContext({ now: NOW });
    await expect(getKarte(harness.context, await harness.actorOf(DEMO_IDS.coach2), DEMO_IDS.student)).rejects.toMatchObject({ code: "forbidden" });
    await expect(getKarte(harness.context, await harness.actorOf(DEMO_IDS.coach), DEMO_IDS.student2)).rejects.toMatchObject({ code: "forbidden" });
  });

  it("今月のつみあげを数える", async () => {
    const harness = createTestContext({ now: NOW });
    const view = await getKarte(harness.context, await harness.actorOf(DEMO_IDS.student));
    expect(view.thisMonth).toMatchObject({ classes: 2, personals: 1, practices: 2, reflections: 1 });
    expect(view.goals[0]?.status).toBe("active");
    expect(view.goals.at(-1)?.status).toBe("achieved");
  });
});

describe("コーチの一覧", () => {
  it("担当の子だけを、声かけの目安が先に並ぶ順で出す", async () => {
    const harness = createTestContext({ now: NOW });
    const rows = await listKarteStudents(harness.context, await harness.actorOf(DEMO_IDS.coach));
    expect(rows.map((row) => row.userId)).toEqual([DEMO_IDS.student3, DEMO_IDS.student]);
    expect(rows[0]?.followUp.needed).toBe(true);
    expect(rows[1]?.followUp.needed).toBe(false);
    const all = await listKarteStudents(harness.context, await harness.actorOf(DEMO_IDS.admin));
    expect(all).toHaveLength(3);
    await expect(listKarteStudents(harness.context, await harness.actorOf(DEMO_IDS.student))).rejects.toMatchObject({ code: "forbidden" });
  });
});

describe("レポート", () => {
  it("コーチが開いても面談メモは入らず、前の期間とくらべる", async () => {
    const harness = createTestContext({ now: NOW });
    const report = await getKarteReport(harness.context, await harness.actorOf(DEMO_IDS.coach), { studentId: DEMO_IDS.student, range: reportRange("2026-11", 1) });
    expect(JSON.stringify(report)).not.toContain("面談");
    expect(report.counts.classes).toBe(2);
    expect(report.previousCounts.classes).toBe(2);
    expect(report.feedbacks).toHaveLength(1);
    expect(report.goals.map((goal) => goal.id)).toEqual(expect.arrayContaining(["kg-sample-001", "kg-sample-002"]));
    expect(report.goals.map((goal) => goal.id)).not.toContain("kg-sample-003");

    const half = await getKarteReport(harness.context, await harness.actorOf(DEMO_IDS.guardian), { range: reportRange("2026-11", 6) });
    expect(half.range.label).toBe("2026年6月〜11月");
    expect(half.counts.classes).toBe(4);
    expect(half.averageRating).toBe(3.5);
  });
});

describe("カルテに書く", () => {
  it("本人は自主練と振り返りだけ。コーチは面談メモも書ける。監査ログに本文は入らない", async () => {
    const harness = createTestContext({ now: NOW });
    const student = await harness.actorOf(DEMO_IDS.student);
    await addKarteEntry(harness.context, student, { studentId: DEMO_IDS.student, kind: "practice", date: "2026-11-12", title: "壁当て", body: "ひみつの本文" });
    await expect(addKarteEntry(harness.context, student, { studentId: DEMO_IDS.student, kind: "feedback", date: "2026-11-12", title: "x", body: "" })).rejects.toMatchObject({ code: "forbidden" });
    await expect(addKarteEntry(harness.context, student, { studentId: DEMO_IDS.student2, kind: "practice", date: "2026-11-12", title: "x", body: "" })).rejects.toMatchObject({ code: "forbidden" });
    await expect(addKarteEntry(harness.context, student, { studentId: DEMO_IDS.student, kind: "practice", date: "2026-11-13", title: "x", body: "" })).rejects.toMatchObject({ code: "invalid" });

    const coach = await harness.actorOf(DEMO_IDS.coach);
    await addKarteEntry(harness.context, coach, { studentId: DEMO_IDS.student, kind: "interview", date: "2026-11-12", title: "面談", body: "家庭の事情" });
    await expect(addKarteEntry(harness.context, coach, { studentId: DEMO_IDS.student, kind: "feedback", date: "2026-11-12", title: "x", body: "", modelVideoId: "no-such" })).rejects.toMatchObject({ code: "invalid" });
    const guardian = await harness.actorOf(DEMO_IDS.guardian);
    await expect(addKarteEntry(harness.context, guardian, { studentId: DEMO_IDS.student, kind: "practice", date: "2026-11-12", title: "x", body: "" })).rejects.toMatchObject({ code: "forbidden" });

    const logs = JSON.stringify(harness.state.auditLogs);
    expect(logs).not.toContain("ひみつの本文");
    expect(logs).not.toContain("家庭の事情");
  });

  it("目標とやることを、本人とコーチが書ける。保護者・ほかのコーチは書けない", async () => {
    const harness = createTestContext({ now: NOW });
    const student = await harness.actorOf(DEMO_IDS.student);
    const input = { studentId: DEMO_IDS.student, term: "month" as const, title: "シュート", reason: "", measure: "", startDate: "2026-11-12", endDate: "2026-12-12", status: "active" as const, progress: 0 };
    const goal = await saveKarteGoal(harness.context, student, input);
    const updated = await saveKarteGoal(harness.context, await harness.actorOf(DEMO_IDS.coach), { ...input, goalId: goal.id, progress: 50 });
    expect(updated).toMatchObject({ id: goal.id, progress: 50, createdBy: DEMO_IDS.student });
    await addKarteAction(harness.context, student, { goalId: goal.id, text: "毎日10本", frequency: "" });
    await expect(saveKarteGoal(harness.context, await harness.actorOf(DEMO_IDS.guardian), input)).rejects.toMatchObject({ code: "forbidden" });
    await expect(addKarteAction(harness.context, await harness.actorOf(DEMO_IDS.coach2), { goalId: goal.id, text: "x", frequency: "" })).rejects.toMatchObject({ code: "forbidden" });
    await expect(saveKarteGoal(harness.context, student, { ...input, endDate: "2026-11-01" })).rejects.toMatchObject({ code: "invalid" });
  });

  it("消せるのは書いた人と運営だけ。本人から面談メモは「無い」扱い", async () => {
    const harness = createTestContext({ now: NOW });
    const student = await harness.actorOf(DEMO_IDS.student);
    await expect(deleteKarteEntry(harness.context, student, { entryId: "ke-sample-015" })).rejects.toMatchObject({ code: "not_found" });
    await expect(deleteKarteEntry(harness.context, student, { entryId: "ke-sample-014" })).rejects.toMatchObject({ code: "forbidden" });
    await deleteKarteEntry(harness.context, student, { entryId: "ke-sample-004" });
    await deleteKarteEntry(harness.context, await harness.actorOf(DEMO_IDS.admin), { entryId: "ke-sample-015" });
    expect(harness.state.karteEntries.map((entry) => entry.id)).not.toContain("ke-sample-015");
  });

  it("見学モードは書けない", async () => {
    const harness = createTestContext({ now: NOW });
    const guest = await harness.actorOf(DEMO_IDS.guest).catch(() => null);
    if (!guest) return;
    await expect(addKarteEntry(harness.context, guest, { studentId: guest.userId, kind: "practice", date: "2026-11-12", title: "x", body: "" })).rejects.toMatchObject({ code: "forbidden" });
  });
});
