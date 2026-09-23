import type { IsoDateTime, PrivateProfile, PublicProfile, UserRole } from "./types";

/**
 * 会員削除（退会）の方針。
 *
 * 行ごと消さずに「個人情報だけを消して、行は残す」。
 * - ポイント履歴・出欠・監査ログは、他の会員やコーチの記録とつながっているので残す必要がある
 * - 一方で本名・メール・表示名・アバターは、退会後に持ち続ける理由がないので消す（仕様 5章: 必要以上に保存しない）
 * 提出物の写真・動画（Storage）は別途削除キューに入れる（Phase 6 で Storage 実装と一緒に）。
 */

export const DELETED_DISPLAY_NAME = "退会したメンバー";
export const DEFAULT_AVATAR_KEY = "default";

export type MemberDeletionCheck = { ok: true } | { ok: false; reason: "self" | "last_admin" | "already_deleted" | "name_mismatch" };

export function checkMemberDeletion(input: {
  actorId: string;
  target: { userId: string; role: UserRole; displayName: string; deletedAt: IsoDateTime | null };
  confirmDisplayName: string;
  activeAdminCount: number;
}): MemberDeletionCheck {
  const { actorId, target, confirmDisplayName, activeAdminCount } = input;
  if (target.deletedAt !== null) return { ok: false, reason: "already_deleted" };
  // 自分を消すと、その場で管理画面から締め出されて取り消しもできなくなる
  if (target.userId === actorId) return { ok: false, reason: "self" };
  // 最後の運営を消すと、誰もアプリを管理できなくなる
  if (target.role === "admin" && activeAdminCount <= 1) return { ok: false, reason: "last_admin" };
  if (confirmDisplayName.trim() !== target.displayName) return { ok: false, reason: "name_mismatch" };
  return { ok: true };
}

export function describeMemberDeletionCheck(check: MemberDeletionCheck): string | null {
  if (check.ok) return null;
  switch (check.reason) {
    case "self":
      return "自分のアカウントはここでは削除できません。別の運営アカウントから操作してください";
    case "last_admin":
      return "運営アカウントが1つだけなので削除できません。先に別の運営アカウントを追加してください";
    case "already_deleted":
      return "この会員はすでに削除されています";
    case "name_mismatch":
      return "表示名が一致しません。削除する会員の表示名をそのまま入力してください";
  }
}

export function anonymizePublicProfile(profile: PublicProfile): PublicProfile {
  return { userId: profile.userId, displayName: DELETED_DISPLAY_NAME, avatarKey: DEFAULT_AVATAR_KEY, ageBand: null, role: profile.role };
}

export function erasePrivateProfile(profile: PrivateProfile, now: Date): PrivateProfile {
  return {
    userId: profile.userId,
    fullName: "",
    // メールはユニーク制約があるので空にせず、届かないドメイン（RFC 2606 の .invalid）に置き換える
    email: `deleted+${profile.userId}@example.invalid`,
    createdAt: profile.createdAt,
    deletedAt: now.toISOString(),
  };
}
