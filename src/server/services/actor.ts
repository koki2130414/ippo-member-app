import type { Actor, UserId } from "@/domain/types";
import type { ServiceContext } from "./context";

/**
 * セッションの userId から Actor を組み立てる。
 * ロール・紐付け・担当範囲は必ず DB から読む。クッキーやフォームに載った値は信用しない。
 * 退会済みの会員は null（= 未ログイン扱い）にする。
 */
export async function loadActor({ store }: ServiceContext, userId: UserId): Promise<Actor | null> {
  const [publicProfile, privateProfile] = await Promise.all([store.getPublicProfile(userId), store.getPrivateProfile(userId)]);
  if (!publicProfile || !privateProfile || privateProfile.deletedAt !== null) return null;

  const role = publicProfile.role;
  // ロールに関係ない関係は読まない（空配列にしておくことで、判定側が誤って使っても何も許可されない）
  const [linkedStudentIds, assignedStudentIds, coachClassRoomIds, enrolledClassRoomIds] = await Promise.all([
    role === "guardian" ? store.listLinkedStudentIds(userId) : Promise.resolve([]),
    role === "coach" ? store.listAssignedStudentIds(userId) : Promise.resolve([]),
    role === "coach" ? store.listCoachClassRoomIds(userId) : Promise.resolve([]),
    role === "student" ? store.listEnrolledClassRoomIds(userId) : Promise.resolve([]),
  ]);
  return { userId, role, linkedStudentIds, assignedStudentIds, coachClassRoomIds, enrolledClassRoomIds };
}
