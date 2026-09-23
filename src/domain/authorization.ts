import { USER_ROLES } from "./types";
import type { Actor, ChatRoom, PointRule, UserId, UserRole } from "./types";

/**
 * 認可の判定（純粋関数）。
 *
 * ここは「誰が何をしてよいか」の唯一の定義。サービス層の requireX はこれを呼んで例外に変えるだけ、
 * Supabase RLS は同じ表（docs/03 の認可マトリクス）を SQL で書き直したもの。
 * 画面の出し分けもこれを使ってよいが、それは認可ではなく「見た目」なので、サーバー側の判定を省く理由にはならない。
 *
 * 迷ったら「拒否」に倒す。許可を足すのは後からでもできるが、漏れた情報は取り戻せない。
 */

export type DenyReason = "wrong_role" | "not_self" | "not_linked" | "not_assigned" | "not_member";

export type AuthorizationDecision = { allowed: true } | { allowed: false; reason: DenyReason };

const ALLOW: AuthorizationDecision = { allowed: true };
function deny(reason: DenyReason): AuthorizationDecision {
  return { allowed: false, reason };
}

export function hasRole(actor: Actor, roles: readonly UserRole[]): AuthorizationDecision {
  return roles.includes(actor.role) ? ALLOW : deny("wrong_role");
}

/**
 * 生徒の情報（進捗・ポイント・ノート・レビュー・診断結果など）を見てよいか。
 * - 生徒: 自分だけ
 * - 保護者: 紐づいた子だけ
 * - コーチ: 担当の生徒だけ
 * - 運営: 全員（ただし操作は監査ログに残す）
 */
export function canViewStudentData(actor: Actor, studentId: UserId): AuthorizationDecision {
  switch (actor.role) {
    case "student":
      return actor.userId === studentId ? ALLOW : deny("not_self");
    case "guardian":
      return actor.linkedStudentIds.includes(studentId) ? ALLOW : deny("not_linked");
    case "coach":
      return actor.assignedStudentIds.includes(studentId) ? ALLOW : deny("not_assigned");
    case "admin":
      return ALLOW;
  }
}

/** ノート・プレー動画・ふりかえりなどを「出す」のは生徒本人だけ。保護者の代理提出は MVP では受けない */
export function canSubmitAsStudent(actor: Actor, studentId: UserId): AuthorizationDecision {
  if (actor.role !== "student") return deny("wrong_role");
  return actor.userId === studentId ? ALLOW : deny("not_self");
}

/** ノート・動画レビューへの返信。担当コーチだけ（運営は閲覧はできるが、コーチになりすまして返信はしない） */
export function canReplyToStudentWork(actor: Actor, studentId: UserId): AuthorizationDecision {
  if (actor.role !== "coach") return deny("wrong_role");
  return actor.assignedStudentIds.includes(studentId) ? ALLOW : deny("not_assigned");
}

/** 個別メニューの作成も担当コーチだけ */
export const canCreatePersonalMenu = canReplyToStudentWork;

/** 出欠の記録。そのクラスの担当コーチか運営 */
export function canRecordAttendance(actor: Actor, classRoomId: string): AuthorizationDecision {
  if (actor.role === "admin") return ALLOW;
  if (actor.role !== "coach") return deny("wrong_role");
  return actor.coachClassRoomIds.includes(classRoomId) ? ALLOW : deny("not_assigned");
}

/**
 * ポイントを手で付与してよいか。
 * system ルール（ログインなど）は利用者の操作では起こせない。サービス層が行動の成立を確かめたうえで付与する。
 */
export function canGrantPoints(actor: Actor, rule: PointRule, studentId: UserId): AuthorizationDecision {
  switch (rule.grantedBy) {
    case "system":
      return deny("wrong_role");
    case "coach":
      if (actor.role === "admin") return ALLOW;
      if (actor.role !== "coach") return deny("wrong_role");
      return actor.assignedStudentIds.includes(studentId) ? ALLOW : deny("not_assigned");
    case "admin":
      return actor.role === "admin" ? ALLOW : deny("wrong_role");
  }
}

/**
 * チャットルームを見てよいか。
 * 運営は監査のために全ルームを見られる（仕様 5章: 運営が閲覧できる監査対象チャンネル）。
 */
export function canViewChatRoom(actor: Actor, room: ChatRoom): AuthorizationDecision {
  if (actor.role === "admin") return ALLOW;
  if (actor.role === "coach") return room.coachIds.includes(actor.userId) ? ALLOW : deny("not_member");
  if (room.kind === "coach_student") {
    if (room.studentId === null) return deny("not_member");
    if (actor.role === "student") return room.studentId === actor.userId ? ALLOW : deny("not_member");
    return actor.linkedStudentIds.includes(room.studentId) ? ALLOW : deny("not_linked");
  }
  // class_broadcast: 生徒は参加クラスのもの、保護者は見ない（子どもの画面で一緒に見る想定）
  if (actor.role === "student" && room.classRoomId !== null) {
    return actor.enrolledClassRoomIds.includes(room.classRoomId) ? ALLOW : deny("not_member");
  }
  return deny("not_member");
}

/**
 * チャットに書き込んでよいか。
 * - クラス全体チャンネルに書けるのはコーチだけ（生徒同士のやりとりの場にしない）
 * - 1対1 チャンネルは、コーチ・その生徒・紐づいた保護者
 * - 運営は書き込まない（非表示などのモデレーションは別の操作）
 */
export function canPostChatMessage(actor: Actor, room: ChatRoom): AuthorizationDecision {
  if (actor.role === "admin") return deny("wrong_role");
  const view = canViewChatRoom(actor, room);
  if (!view.allowed) return view;
  if (room.kind === "class_broadcast" && actor.role !== "coach") return deny("wrong_role");
  return ALLOW;
}

/** 自分のメッセージの編集・削除。記録は監査ログに残す（サービス層） */
export function canEditOwnMessage(actor: Actor, message: { authorId: UserId }): AuthorizationDecision {
  return message.authorId === actor.userId ? ALLOW : deny("not_self");
}

export function canModerateChat(actor: Actor): AuthorizationDecision {
  return hasRole(actor, ["admin"]);
}

export function canAdminister(actor: Actor): AuthorizationDecision {
  return hasRole(actor, ["admin"]);
}

/** 画面でも使う「ロールごとの入口」。proxy.ts でルート単位の粗い判定に使う */
export const ROLE_HOME: Record<UserRole, string> = {
  student: "/home",
  guardian: "/guardian",
  coach: "/coach",
  admin: "/admin",
};

/**
 * パスの先頭で、どのロールが入ってよいかを決める（proxy.ts 用の粗い判定）。
 * 細かい判定（どの生徒の情報か）はサービス層で必ずもう一度行う。
 */
export function rolesAllowedForPath(pathname: string): readonly UserRole[] | "public" {
  const matches = (path: string): boolean => pathname === path || (path !== "/" && pathname.startsWith(`${path}/`));
  const publicPaths = ["/", "/contact-public", "/login", "/register", "/reset-password", "/terms", "/privacy"];
  if (publicPaths.some(matches)) return "public";
  // どのロールでも使う画面。/forbidden を特定ロールに絞ると、弾かれた人の行き先が無くなって転送が循環する
  const everyRolePaths = ["/forbidden", "/onboarding", "/settings", "/announcements", "/notifications", "/chat"];
  if (everyRolePaths.some(matches)) return USER_ROLES;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return ["admin"];
  if (pathname === "/coach" || pathname.startsWith("/coach/")) return ["coach"];
  if (pathname === "/guardian" || pathname.startsWith("/guardian/")) return ["guardian"];
  // 生徒向けの画面は保護者も（紐づいた子の分だけ）見る。コーチ・運営は各自の画面を使う
  return ["student", "guardian"];
}
