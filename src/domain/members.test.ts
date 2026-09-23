import { describe, expect, it } from "vitest";
import { DELETED_DISPLAY_NAME, anonymizePublicProfile, checkMemberDeletion, describeMemberDeletionCheck, erasePrivateProfile } from "./members";

const target = { userId: "s1", role: "student" as const, displayName: "テスト太郎", deletedAt: null };

describe("会員削除の事前チェック", () => {
  it("表示名を打ち直せば削除できる", () => {
    expect(checkMemberDeletion({ actorId: "admin-1", target, confirmDisplayName: " テスト太郎 ", activeAdminCount: 1 })).toEqual({ ok: true });
  });
  it("表示名が違えば止める", () => {
    const check = checkMemberDeletion({ actorId: "admin-1", target, confirmDisplayName: "テスト", activeAdminCount: 1 });
    expect(check).toEqual({ ok: false, reason: "name_mismatch" });
    expect(describeMemberDeletionCheck(check)).toContain("表示名をそのまま入力");
  });
  it("自分自身・最後の運営・削除済みは止める", () => {
    expect(checkMemberDeletion({ actorId: "s1", target, confirmDisplayName: "テスト太郎", activeAdminCount: 2 })).toEqual({ ok: false, reason: "self" });
    expect(checkMemberDeletion({ actorId: "a2", target: { ...target, role: "admin" }, confirmDisplayName: "テスト太郎", activeAdminCount: 1 })).toEqual({ ok: false, reason: "last_admin" });
    expect(checkMemberDeletion({ actorId: "a2", target: { ...target, deletedAt: "2026-01-01T00:00:00Z" }, confirmDisplayName: "テスト太郎", activeAdminCount: 2 })).toEqual({ ok: false, reason: "already_deleted" });
  });
});

describe("個人情報の消去", () => {
  it("本名・メールを消し、削除日時を入れる", () => {
    const erased = erasePrivateProfile({ userId: "s1", fullName: "本名", email: "a@example.com", createdAt: "2026-01-01T00:00:00Z", deletedAt: null }, new Date("2026-09-24T00:00:00Z"));
    expect(erased.fullName).toBe("");
    expect(erased.email).not.toContain("a@example.com");
    expect(erased.email.endsWith(".invalid")).toBe(true);
    expect(erased.deletedAt).toBe("2026-09-24T00:00:00.000Z");
  });
  it("公開プロフィールを匿名化する", () => {
    expect(anonymizePublicProfile({ userId: "s1", displayName: "テスト太郎", avatarKey: "cat", ageBand: "junior_high", role: "student" })).toEqual({
      userId: "s1", displayName: DELETED_DISPLAY_NAME, avatarKey: "default", ageBand: null, role: "student",
    });
  });
});
