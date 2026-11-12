import { describe, expect, it } from "vitest";
import { assessFollowUp, averageRating, canDeleteKarteEntry, canViewStaffOnlyKarte, canWriteKarteEntry, canWriteKarteGoal, reportRange } from "./karte";
import type { Actor } from "./types";

const actor = (role: Actor["role"], userId: string, extra: Partial<Actor> = {}): Actor => ({
  userId, role, linkedStudentIds: [], assignedStudentIds: [], coachClassRoomIds: [], enrolledClassRoomIds: [], ...extra,
});
const student = actor("student", "s1");
const otherStudent = actor("student", "s2");
const guardian = actor("guardian", "g1", { linkedStudentIds: ["s1"] });
const coach = actor("coach", "c1", { assignedStudentIds: ["s1"] });
const otherCoach = actor("coach", "c2", { assignedStudentIds: ["s2"] });
const admin = actor("admin", "a1");

describe("カルテの権限", () => {
  it("面談メモは担当コーチと運営だけ", () => {
    expect(canViewStaffOnlyKarte(coach, "s1").allowed).toBe(true);
    expect(canViewStaffOnlyKarte(admin, "s1").allowed).toBe(true);
    for (const who of [student, guardian, otherCoach]) expect(canViewStaffOnlyKarte(who, "s1").allowed).toBe(false);
  });

  it("本人は自主練と振り返りだけ書ける。保護者は書けない。担当外のコーチも書けない", () => {
    expect(canWriteKarteEntry(student, "s1", "practice").allowed).toBe(true);
    expect(canWriteKarteEntry(student, "s1", "reflection").allowed).toBe(true);
    for (const kind of ["class", "personal", "feedback", "interview"] as const) expect(canWriteKarteEntry(student, "s1", kind).allowed).toBe(false);
    expect(canWriteKarteEntry(otherStudent, "s1", "practice").allowed).toBe(false);
    expect(canWriteKarteEntry(guardian, "s1", "practice").allowed).toBe(false);
    expect(canWriteKarteEntry(otherCoach, "s1", "feedback").allowed).toBe(false);
    expect(canWriteKarteEntry(coach, "s1", "interview").allowed).toBe(true);
    expect(canWriteKarteEntry(admin, "s1", "class").allowed).toBe(true);
  });

  it("目標は本人・担当コーチ・運営", () => {
    expect(canWriteKarteGoal(student, "s1").allowed).toBe(true);
    expect(canWriteKarteGoal(coach, "s1").allowed).toBe(true);
    expect(canWriteKarteGoal(guardian, "s1").allowed).toBe(false);
    expect(canWriteKarteGoal(otherStudent, "s1").allowed).toBe(false);
  });

  it("記録を消せるのは書いた人と運営", () => {
    expect(canDeleteKarteEntry(coach, { authorId: "c1", studentId: "s1" }).allowed).toBe(true);
    expect(canDeleteKarteEntry(student, { authorId: "c1", studentId: "s1" }).allowed).toBe(false);
    expect(canDeleteKarteEntry(admin, { authorId: "c1", studentId: "s1" }).allowed).toBe(true);
  });
});

describe("フォローの目安", () => {
  it("クラスに21日以上来ていない・14日以上記録がない子に印をつける", () => {
    expect(assessFollowUp({ today: "2026-11-12", lastClassDate: "2026-11-01", lastActivityDate: "2026-11-10" }).needed).toBe(false);
    expect(assessFollowUp({ today: "2026-11-12", lastClassDate: "2026-10-22", lastActivityDate: "2026-11-10" }).reasons).toEqual(["クラスに21日来ていません"]);
    expect(assessFollowUp({ today: "2026-11-12", lastClassDate: null, lastActivityDate: "2026-10-29" }).reasons).toEqual(["14日間、記録がありません"]);
    expect(assessFollowUp({ today: "2026-11-12", lastClassDate: null, lastActivityDate: null }).reasons).toEqual(["まだ記録がありません"]);
  });
});

describe("レポートの期間", () => {
  it("1か月と半年", () => {
    expect(reportRange("2026-11", 1)).toMatchObject({ from: "2026-11-01", to: "2026-11-30", label: "2026年11月" });
    expect(reportRange("2026-02", 1)).toMatchObject({ from: "2026-02-01", to: "2026-02-28" });
    expect(reportRange("2026-12", 1)).toMatchObject({ to: "2026-12-31" });
    expect(reportRange("2026-11", 6)).toMatchObject({ from: "2026-06-01", to: "2026-11-30", label: "2026年6月〜11月" });
    expect(reportRange("2026-03", 6)).toMatchObject({ from: "2025-10-01", to: "2026-03-31", label: "2025年10月〜2026年3月" });
  });

  it("自己評価の平均", () => {
    expect(averageRating([{ rating: 3 }, { rating: 4 }, { rating: null }])).toBe(3.5);
    expect(averageRating([])).toBeNull();
  });
});
