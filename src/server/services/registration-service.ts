import { CONSENT_VERSION, checkReviewable, gradeToAgeBand } from "@/domain/registration";
import type { RegistrationApplicationOutput } from "@/domain/schemas";
import type { Actor, ApplicationStatus, PlanCode, RegistrationApplication, UserId } from "@/domain/types";
import type { Page } from "@/data/data-store";
import { findPlan } from "@/domain/plans";
import { createInvitationWithStore, type IssuedInvitation } from "./account-service";
import type { ServiceContext } from "./context";
import { conflict, invalid, notFound } from "./errors";
import { requireAdmin } from "./guards";

/**
 * 入会の申し込み → 運営の承認・見送り。
 *
 * 申し込みはログインなしで誰でも送れる（保護者が送る）。そのため:
 * - 集める項目は運営が決めたものだけ（名前・学年・出身地（都道府県）・メール）＋表示名
 * - 同じメールで審査待ちが残っていたら重ねて受け付けない（いたずらの連投を減らす）
 * - 見送りにしたら、子どもの名前は消す（保存を続ける理由がないため）。連絡用のメールは残す
 */

export const APPLICATION_PAGE_SIZE = 20;
const MAX_PENDING_PER_EMAIL = 3;

export async function submitApplication(context: ServiceContext, input: RegistrationApplicationOutput): Promise<{ applicationId: string }> {
  if ((await context.store.countPendingApplicationsByEmail(input.guardianEmail)) >= MAX_PENDING_PER_EMAIL) {
    throw conflict("このメールアドレスからの申し込みを、すでにお預かりしています。運営からの連絡をお待ちください", "application:too_many_pending");
  }
  const applicationId = context.newId();
  await context.store.createApplication({
    id: applicationId,
    status: "pending",
    guardianEmail: input.guardianEmail,
    childFullName: input.childFullName,
    childDisplayName: input.childDisplayName,
    grade: input.grade,
    prefecture: input.prefecture,
    consentVersion: CONSENT_VERSION,
    createdAt: context.now().toISOString(),
    reviewedAt: null,
    reviewedBy: null,
    reviewNote: null,
    studentUserId: null,
    guardianUserId: null,
  });
  return { applicationId };
}

export async function listApplicationsForAdmin(context: ServiceContext, actor: Actor | null, query: { status: ApplicationStatus; page: number }): Promise<Page<RegistrationApplication>> {
  requireAdmin(actor, "application.list");
  return context.store.listApplications({ status: query.status, page: query.page, pageSize: APPLICATION_PAGE_SIZE });
}

export interface ApprovalResult {
  studentUserId: UserId;
  guardianUserId: UserId;
  invitation: IssuedInvitation;
  /** 保護者がすでに会員だった（きょうだいの申し込みなど）。その場合も招待リンクで子どものパスワードを決めてもらう */
  reusedGuardian: boolean;
}

/**
 * 承認。生徒と保護者のアカウント・紐付け・プラン・招待リンクを、全部まとめて作る（途中で失敗したら何も残さない）。
 */
export async function approveApplication(context: ServiceContext, actor: Actor | null, input: { applicationId: string; planCode: PlanCode | null }): Promise<ApprovalResult> {
  const admin = requireAdmin(actor, "application.approve");
  if (input.planCode !== null && !findPlan(await context.store.listPlans(), input.planCode)) throw invalid("そのプランは見つかりません。一覧からえらんでください");

  return context.store.transaction(async (store) => {
    const application = await store.getApplication(input.applicationId);
    if (!application) throw notFound("application.approve");
    const reviewable = checkReviewable(application);
    if (!reviewable.ok) throw conflict(reviewable.message, "application.approve:not_pending");
    const now = context.now();

    // 保護者: 同じメールの会員がいればその人に紐づける
    let guardianUserId = await store.findUserIdByEmail(application.guardianEmail);
    let reusedGuardian = false;
    if (guardianUserId) {
      const existing = await store.getPublicProfile(guardianUserId);
      if (existing?.role !== "guardian") throw conflict("このメールアドレスは保護者以外のアカウントで使われています。申し込みのメールアドレスを確かめてください");
      reusedGuardian = true;
    } else {
      guardianUserId = context.newId();
      const created = await store.createMember({
        publicProfile: { userId: guardianUserId, displayName: `${application.childDisplayName}の保護者`, avatarKey: "default", ageBand: "adult", role: "guardian" },
        privateProfile: { userId: guardianUserId, fullName: "", email: application.guardianEmail, grade: null, prefecture: null, createdAt: now.toISOString(), deletedAt: null },
      });
      if (created.outcome === "email_taken") throw conflict("このメールアドレスはすでに使われています");
    }

    const studentUserId = context.newId();
    await store.createMember({
      publicProfile: { userId: studentUserId, displayName: application.childDisplayName, avatarKey: "default", ageBand: gradeToAgeBand(application.grade), role: "student" },
      privateProfile: { userId: studentUserId, fullName: application.childFullName, email: null, grade: application.grade, prefecture: application.prefecture, createdAt: now.toISOString(), deletedAt: null },
    });
    await store.createParentStudentLink({ guardianId: guardianUserId, studentId: studentUserId, createdAt: now.toISOString() });
    if (input.planCode !== null) await store.replaceMembership({ userId: studentUserId, planCode: input.planCode, assignedBy: admin.userId, now });

    const invitation = await createInvitationWithStore(
      context,
      store,
      reusedGuardian
        ? { purpose: "account_setup", guardianUserId: null, studentUserId: null, accountUserId: studentUserId }
        : { purpose: "family_setup", guardianUserId, studentUserId, accountUserId: null },
      admin.userId,
    );

    const updated = await store.completeReview({ ...application, status: "approved", reviewedAt: now.toISOString(), reviewedBy: admin.userId, studentUserId, guardianUserId });
    if (!updated) throw conflict("ほかの運営が先に審査しました。一覧を開きなおしてください", "application.approve:race");
    await store.appendAuditLog({
      id: context.newId(),
      actorId: admin.userId,
      actorRole: admin.role,
      action: "application.approve",
      targetType: "application",
      targetId: application.id,
      metadata: { studentUserId, guardianUserId, planCode: input.planCode, reusedGuardian },
      createdAt: now.toISOString(),
    });
    return { studentUserId, guardianUserId, invitation, reusedGuardian };
  });
}

/** 見送り。子どもの名前は消し、連絡用のメールと学年・都道府県（個人を特定しにくい）だけを残す */
export async function rejectApplication(context: ServiceContext, actor: Actor | null, input: { applicationId: string; note?: string | undefined }): Promise<void> {
  const admin = requireAdmin(actor, "application.reject");
  const application = await context.store.getApplication(input.applicationId);
  if (!application) throw notFound("application.reject");
  const reviewable = checkReviewable(application);
  if (!reviewable.ok) throw conflict(reviewable.message, "application.reject:not_pending");
  const now = context.now();
  const updated = await context.store.completeReview({
    ...application,
    status: "rejected",
    childFullName: "",
    reviewedAt: now.toISOString(),
    reviewedBy: admin.userId,
    reviewNote: input.note?.trim() ? input.note.trim() : null,
  });
  if (!updated) throw conflict("ほかの運営が先に審査しました。一覧を開きなおしてください", "application.reject:race");
  // メモの本文は監査ログに書き写さない
  await context.store.appendAuditLog({
    id: context.newId(),
    actorId: admin.userId,
    actorRole: admin.role,
    action: "application.reject",
    targetType: "application",
    targetId: application.id,
    metadata: { hasNote: Boolean(input.note?.trim()) },
    createdAt: now.toISOString(),
  });
}
