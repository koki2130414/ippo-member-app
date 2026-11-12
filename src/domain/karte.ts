import { addJstDays, diffJstDays } from "./jst";
import type { Actor, JstDate, KarteEntry, KarteEntryKind, UserId } from "./types";
import { STAFF_ONLY_KARTE_KINDS } from "./types";
import { type AuthorizationDecision, canViewStudentData } from "./authorization";

/**
 * カルテのルール（純粋関数）。
 *
 * 見る: 本人・紐づいた保護者・担当コーチ・運営（canViewStudentData と同じ）
 * 面談メモ: 担当コーチと運営だけ（本人・保護者には出さない）
 * 書く:
 *   - 本人は「自主練」「振り返り」と、自分の目標・行動計画
 *   - 担当コーチと運営は、すべての種類
 *   - 保護者は見るだけ（MVP）
 */

export const KARTE_KIND_LABELS: Record<KarteEntryKind, string> = {
  class: "クラス",
  personal: "パーソナル",
  practice: "自主練・取り組み",
  reflection: "振り返り",
  feedback: "コーチから",
  interview: "面談メモ（コーチだけ）",
};

const STUDENT_WRITABLE_KINDS: readonly KarteEntryKind[] = ["practice", "reflection"];

function allow(): AuthorizationDecision {
  return { allowed: true };
}

function isStaffFor(actor: Actor, studentId: UserId): boolean {
  if (actor.role === "admin") return true;
  return actor.role === "coach" && actor.assignedStudentIds.includes(studentId);
}

export function canViewKarte(actor: Actor, studentId: UserId): AuthorizationDecision {
  return canViewStudentData(actor, studentId);
}

/** 面談メモなど、コーチと運営だけの記録を見てよいか */
export function canViewStaffOnlyKarte(actor: Actor, studentId: UserId): AuthorizationDecision {
  if (isStaffFor(actor, studentId)) return allow();
  return { allowed: false, reason: actor.role === "coach" ? "not_assigned" : "wrong_role" };
}

export function canWriteKarteEntry(actor: Actor, studentId: UserId, kind: KarteEntryKind): AuthorizationDecision {
  if (isStaffFor(actor, studentId)) return allow();
  if (actor.role === "student") {
    if (actor.userId !== studentId) return { allowed: false, reason: "not_self" };
    return STUDENT_WRITABLE_KINDS.includes(kind) ? allow() : { allowed: false, reason: "wrong_role" };
  }
  return { allowed: false, reason: actor.role === "coach" ? "not_assigned" : "wrong_role" };
}

/** 目標と行動計画は、本人と担当コーチ・運営が書ける（いっしょに決めるもの） */
export function canWriteKarteGoal(actor: Actor, studentId: UserId): AuthorizationDecision {
  if (isStaffFor(actor, studentId)) return allow();
  if (actor.role === "student") return actor.userId === studentId ? allow() : { allowed: false, reason: "not_self" };
  return { allowed: false, reason: actor.role === "coach" ? "not_assigned" : "wrong_role" };
}

/** 記録を消せるのは、書いた本人と運営だけ */
export function canDeleteKarteEntry(actor: Actor, entry: Pick<KarteEntry, "authorId" | "studentId">): AuthorizationDecision {
  if (actor.role === "admin") return allow();
  return entry.authorId === actor.userId ? allow() : { allowed: false, reason: "not_self" };
}

export function isStaffOnlyKind(kind: KarteEntryKind): boolean {
  return STAFF_ONLY_KARTE_KINDS.includes(kind);
}

// --- 集計 ---

export interface ActivityCounts {
  classes: number;
  personals: number;
  practices: number;
  reflections: number;
  feedbacks: number;
  videos: number;
  lectures: number;
}

export function countActivities(entries: readonly Pick<KarteEntry, "kind">[], completedVideos: number, completedLectures: number): ActivityCounts {
  const count = (kind: KarteEntryKind) => entries.filter((entry) => entry.kind === kind).length;
  return {
    classes: count("class"),
    personals: count("personal"),
    practices: count("practice"),
    reflections: count("reflection"),
    feedbacks: count("feedback"),
    videos: completedVideos,
    lectures: completedLectures,
  };
}

/**
 * コーチが声をかけたほうがよい子の目安。責めるためではなく「最近どう？」のきっかけにする。
 * - クラスに21日以上来ていない（クラスの記録が一度もない子は対象外: まだ始めていないだけかもしれない）
 * - 14日以上、何の記録もない（クラス・パーソナル・自主練・動画）
 */
export const FOLLOW_UP_CLASS_DAYS = 21;
export const FOLLOW_UP_ACTIVITY_DAYS = 14;

export interface FollowUp {
  needed: boolean;
  reasons: string[];
  lastClassDate: JstDate | null;
  lastActivityDate: JstDate | null;
}

export function assessFollowUp(input: { today: JstDate; lastClassDate: JstDate | null; lastActivityDate: JstDate | null }): FollowUp {
  const reasons: string[] = [];
  if (input.lastClassDate !== null && diffJstDays(input.today, input.lastClassDate) >= FOLLOW_UP_CLASS_DAYS) {
    reasons.push(`クラスに${diffJstDays(input.today, input.lastClassDate)}日来ていません`);
  }
  if (input.lastActivityDate === null) {
    reasons.push("まだ記録がありません");
  } else if (diffJstDays(input.today, input.lastActivityDate) >= FOLLOW_UP_ACTIVITY_DAYS) {
    reasons.push(`${diffJstDays(input.today, input.lastActivityDate)}日間、記録がありません`);
  }
  return { needed: reasons.length > 0, reasons, lastClassDate: input.lastClassDate, lastActivityDate: input.lastActivityDate };
}

// --- 期間 ---

export interface ReportRange {
  from: JstDate;
  to: JstDate;
  /** 例: 2026年11月 / 2026年6月〜11月 */
  label: string;
  months: number;
}

/** "2026-11" と月数（1 か 6）から、その月を最後にした期間を作る */
export function reportRange(month: string, months: 1 | 6): ReportRange {
  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const monthNumber = Number(monthText);
  const startIndex = year * 12 + (monthNumber - 1) - (months - 1);
  const startYear = Math.floor(startIndex / 12);
  const startMonth = (startIndex % 12) + 1;
  const pad = (value: number) => String(value).padStart(2, "0");
  const from = `${startYear}-${pad(startMonth)}-01`;
  const nextIndex = year * 12 + monthNumber;
  const to = addJstDays(`${Math.floor(nextIndex / 12)}-${pad((nextIndex % 12) + 1)}-01`, -1);
  const label =
    months === 1 ? `${year}年${monthNumber}月` : startYear === year ? `${year}年${startMonth}月〜${monthNumber}月` : `${startYear}年${startMonth}月〜${year}年${monthNumber}月`;
  return { from, to, label, months };
}

export function averageRating(entries: readonly Pick<KarteEntry, "rating">[]): number | null {
  const ratings = entries.map((entry) => entry.rating).filter((rating): rating is number => rating !== null);
  if (ratings.length === 0) return null;
  return Math.round((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) * 10) / 10;
}
