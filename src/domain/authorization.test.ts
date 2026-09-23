import { describe, expect, it } from "vitest";
import {
  canAdminister,
  canEditOwnMessage,
  canGrantPoints,
  canPostChatMessage,
  canRecordAttendance,
  canReplyToStudentWork,
  canSubmitAsStudent,
  canViewChatRoom,
  canViewStudentData,
  rolesAllowedForPath,
} from "./authorization";
import { DEFAULT_POINT_RULES, findPointRule } from "./points";
import type { Actor, ChatRoom, PointRule, PointRuleCode } from "./types";

function actor(overrides: Partial<Actor> & Pick<Actor, "userId" | "role">): Actor {
  return { linkedStudentIds: [], assignedStudentIds: [], coachClassRoomIds: [], enrolledClassRoomIds: [], ...overrides };
}

const studentA = actor({ userId: "student-a", role: "student", enrolledClassRoomIds: ["class-1"] });
const studentB = actor({ userId: "student-b", role: "student" });
const guardianOfA = actor({ userId: "guardian-a", role: "guardian", linkedStudentIds: ["student-a"] });
const coachOfA = actor({ userId: "coach-a", role: "coach", assignedStudentIds: ["student-a"], coachClassRoomIds: ["class-1"] });
const otherCoach = actor({ userId: "coach-x", role: "coach", assignedStudentIds: ["student-b"], coachClassRoomIds: ["class-2"] });
const admin = actor({ userId: "admin-1", role: "admin" });

function rule(code: PointRuleCode): PointRule {
  const found = findPointRule(DEFAULT_POINT_RULES, code);
  if (!found) throw new Error(code);
  return found;
}

describe("生徒の情報を見る（4ロール）", () => {
  const cases: [string, Actor, boolean][] = [
    ["生徒本人", studentA, true],
    ["別の生徒", studentB, false],
    ["紐づいた保護者", guardianOfA, true],
    ["紐づいていない保護者", actor({ userId: "guardian-z", role: "guardian", linkedStudentIds: ["student-b"] }), false],
    ["担当コーチ", coachOfA, true],
    ["担当外のコーチ", otherCoach, false],
    ["運営", admin, true],
  ];
  it.each(cases)("%s → %s", (_label, who, expected) => {
    expect(canViewStudentData(who, "student-a").allowed).toBe(expected);
  });
});

describe("提出・返信", () => {
  it("提出できるのは生徒本人だけ（保護者の代理も不可）", () => {
    expect(canSubmitAsStudent(studentA, "student-a").allowed).toBe(true);
    expect(canSubmitAsStudent(studentB, "student-a").allowed).toBe(false);
    expect(canSubmitAsStudent(guardianOfA, "student-a").allowed).toBe(false);
    expect(canSubmitAsStudent(admin, "student-a").allowed).toBe(false);
  });
  it("返信できるのは担当コーチだけ（運営もなりすまさない）", () => {
    expect(canReplyToStudentWork(coachOfA, "student-a").allowed).toBe(true);
    expect(canReplyToStudentWork(otherCoach, "student-a").allowed).toBe(false);
    expect(canReplyToStudentWork(admin, "student-a").allowed).toBe(false);
    expect(canReplyToStudentWork(studentA, "student-a").allowed).toBe(false);
  });
  it("出欠は担当クラスのコーチと運営", () => {
    expect(canRecordAttendance(coachOfA, "class-1").allowed).toBe(true);
    expect(canRecordAttendance(otherCoach, "class-1").allowed).toBe(false);
    expect(canRecordAttendance(admin, "class-1").allowed).toBe(true);
    expect(canRecordAttendance(studentA, "class-1").allowed).toBe(false);
  });
});

describe("ポイントの手動付与", () => {
  it("system ルールは誰も手で付与できない", () => {
    expect(canGrantPoints(admin, rule("login_daily"), "student-a").allowed).toBe(false);
    expect(canGrantPoints(coachOfA, rule("video_completed"), "student-a").allowed).toBe(false);
  });
  it("コーチ加点は担当コーチと運営", () => {
    expect(canGrantPoints(coachOfA, rule("coach_bonus"), "student-a").allowed).toBe(true);
    expect(canGrantPoints(otherCoach, rule("coach_bonus"), "student-a").allowed).toBe(false);
    expect(canGrantPoints(admin, rule("coach_bonus"), "student-a").allowed).toBe(true);
    expect(canGrantPoints(studentA, rule("coach_bonus"), "student-a").allowed).toBe(false);
  });
  it("運営調整は運営だけ", () => {
    expect(canGrantPoints(coachOfA, rule("admin_adjustment"), "student-a").allowed).toBe(false);
    expect(canGrantPoints(admin, rule("admin_adjustment"), "student-a").allowed).toBe(true);
  });
});

describe("チャット（監査対象・生徒同士の DM なし）", () => {
  const oneOnOne: ChatRoom = { id: "r1", kind: "coach_student", studentId: "student-a", classRoomId: null, coachIds: ["coach-a"], createdAt: "2026-09-01T00:00:00Z" };
  const broadcast: ChatRoom = { id: "r2", kind: "class_broadcast", studentId: null, classRoomId: "class-1", coachIds: ["coach-a"], createdAt: "2026-09-01T00:00:00Z" };

  it("1対1 は生徒本人・紐づいた保護者・担当コーチ・運営（閲覧）", () => {
    expect(canViewChatRoom(studentA, oneOnOne).allowed).toBe(true);
    expect(canViewChatRoom(studentB, oneOnOne).allowed).toBe(false);
    expect(canViewChatRoom(guardianOfA, oneOnOne).allowed).toBe(true);
    expect(canViewChatRoom(coachOfA, oneOnOne).allowed).toBe(true);
    expect(canViewChatRoom(otherCoach, oneOnOne).allowed).toBe(false);
    expect(canViewChatRoom(admin, oneOnOne).allowed).toBe(true);
  });
  it("運営は閲覧できるが書き込まない", () => {
    expect(canPostChatMessage(admin, oneOnOne).allowed).toBe(false);
  });
  it("クラス全体チャンネルは生徒が読めても書けない（生徒同士のやりとりの場にしない）", () => {
    expect(canViewChatRoom(studentA, broadcast).allowed).toBe(true);
    expect(canPostChatMessage(studentA, broadcast).allowed).toBe(false);
    expect(canPostChatMessage(coachOfA, broadcast).allowed).toBe(true);
    expect(canViewChatRoom(studentB, broadcast).allowed).toBe(false);
  });
  it("生徒ID の無い 1対1 ルームは誰も（運営以外）見られない", () => {
    const broken: ChatRoom = { ...oneOnOne, studentId: null };
    expect(canViewChatRoom(studentA, broken).allowed).toBe(false);
    expect(canViewChatRoom(guardianOfA, broken).allowed).toBe(false);
  });
  it("編集・削除は自分のメッセージだけ", () => {
    expect(canEditOwnMessage(studentA, { authorId: "student-a" }).allowed).toBe(true);
    expect(canEditOwnMessage(studentA, { authorId: "coach-a" }).allowed).toBe(false);
  });
});

describe("運営とルート", () => {
  it("管理は運営だけ", () => {
    for (const who of [studentA, guardianOfA, coachOfA]) expect(canAdminister(who).allowed).toBe(false);
    expect(canAdminister(admin).allowed).toBe(true);
  });
  it("パスごとの入口", () => {
    expect(rolesAllowedForPath("/")).toBe("public");
    expect(rolesAllowedForPath("/login")).toBe("public");
    expect(rolesAllowedForPath("/reset-password/confirm")).toBe("public");
    expect(rolesAllowedForPath("/admin/users")).toEqual(["admin"]);
    expect(rolesAllowedForPath("/administrator")).toEqual(["student", "guardian"]);
    expect(rolesAllowedForPath("/coach/notes")).toEqual(["coach"]);
    expect(rolesAllowedForPath("/guardian")).toEqual(["guardian"]);
    expect(rolesAllowedForPath("/video-review/abc")).toEqual(["student", "guardian"]);
    expect(rolesAllowedForPath("/forbidden")).toContain("coach");
  });
});
