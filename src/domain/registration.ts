import type { AgeBand, Grade, Invitation, RegistrationApplication } from "./types";

/**
 * 入会の申し込み・承認・招待のルール（純粋関数）。
 *
 * 流れ: 保護者が申し込む → 運営が承認（生徒と保護者のアカウント・紐付け・プランを作り、招待リンクを発行）
 *       → 運営が招待リンクを保護者に送る（LINE やメール。アプリからは自動送信しない）
 *       → 保護者がリンクを開いて、自分と子どものパスワードを決める → ログインできる
 */

/** 同意してもらう規約・プライバシーポリシーの版。文面を変えたらここを上げる */
export const CONSENT_VERSION = "2026-09-29-draft";

export const INVITATION_TTL_DAYS = 14;
export const PASSWORD_MIN_LENGTH = 8;

export const GRADE_LABELS: Record<Grade, string> = {
  e1: "小学1年生",
  e2: "小学2年生",
  e3: "小学3年生",
  e4: "小学4年生",
  e5: "小学5年生",
  e6: "小学6年生",
  j1: "中学1年生",
  j2: "中学2年生",
  j3: "中学3年生",
};

/** 表示の出し分け（ひらがなの量など）に使う年代。学年そのものは公開プロフィールに載せない */
export function gradeToAgeBand(grade: Grade): AgeBand {
  if (grade === "e1" || grade === "e2" || grade === "e3") return "elementary_lower";
  if (grade === "e4" || grade === "e5" || grade === "e6") return "elementary_upper";
  return "junior_high";
}

export type ReviewCheck = { ok: true } | { ok: false; message: string };

export function checkReviewable(application: Pick<RegistrationApplication, "status">): ReviewCheck {
  if (application.status === "pending") return { ok: true };
  return { ok: false, message: application.status === "approved" ? "この申し込みはすでに承認しています" : "この申し込みはすでに見送りにしています" };
}

export type InvitationCheck = { ok: true } | { ok: false; message: string };

export function checkInvitationUsable(invitation: Pick<Invitation, "usedAt" | "expiresAt"> | null, now: Date): InvitationCheck {
  if (!invitation) return { ok: false, message: "このリンクは使えません。運営から届いたリンクをもう一度たしかめてください" };
  if (invitation.usedAt !== null) return { ok: false, message: "このリンクはもう使われています。ログイン画面からログインしてください" };
  if (new Date(invitation.expiresAt).getTime() <= now.getTime()) {
    return { ok: false, message: "このリンクの有効期限が切れています。お手数ですが、運営に新しいリンクをたのんでください" };
  }
  return { ok: true };
}

export function invitationExpiresAt(now: Date): Date {
  return new Date(now.getTime() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);
}

/** 生徒のログインID（例: ippo-482913）。子どもが入力しやすいよう、英小文字と数字だけ */
export const STUDENT_LOGIN_ID_PATTERN = /^ippo-\d{6}$/;

export function formatStudentLoginId(sixDigits: number): string {
  return `ippo-${String(Math.abs(Math.trunc(sixDigits)) % 1_000_000).padStart(6, "0")}`;
}

/** ログインIDの正規化。メールも生徒IDも大文字小文字を区別しない */
export function normalizeLoginId(value: string): string {
  return value.trim().toLowerCase();
}
