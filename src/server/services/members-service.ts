import { anonymizePublicProfile, checkMemberDeletion, describeMemberDeletionCheck, erasePrivateProfile } from "@/domain/members";
import { findPlan } from "@/domain/plans";
import type { MemberCreateInput } from "@/domain/schemas";
import type { Actor, AgeBand, PlanCode, UserId, UserRole } from "@/domain/types";
import type { Page } from "@/data/data-store";
import type { ServiceContext } from "./context";
import { recordAudit } from "./audit";
import { conflict, invalid, notFound } from "./errors";
import { requireAdmin } from "./guards";

/**
 * 会員管理（運営のみ）。すべての操作を監査ログに残す。
 */

export interface AdminMemberRow {
  userId: UserId;
  displayName: string;
  role: UserRole;
  ageBand: AgeBand | null;
  planCode: PlanCode | null;
}

export const ADMIN_MEMBER_PAGE_SIZE = 20;

/**
 * 運営の会員一覧。一覧には本名・メールを出さない（必要なときだけ個別の画面で見る。画面をのぞき見されても漏れる量を減らす）。
 */
export async function listMembersForAdmin(context: ServiceContext, actor: Actor | null, query: { role: UserRole | undefined; page: number }): Promise<Page<AdminMemberRow>> {
  requireAdmin(actor, "member.list");
  const page = await context.store.listMembers({ role: query.role, page: query.page, pageSize: ADMIN_MEMBER_PAGE_SIZE });
  const items = await Promise.all(
    page.items.map(async (profile) => {
      const membership = profile.role === "student" ? await context.store.getActiveMembership(profile.userId) : null;
      return { userId: profile.userId, displayName: profile.displayName, role: profile.role, ageBand: profile.ageBand, planCode: membership?.planCode ?? null };
    }),
  );
  return { ...page, items };
}

export async function createMember(context: ServiceContext, actor: Actor | null, input: MemberCreateInput): Promise<{ userId: UserId }> {
  const admin = requireAdmin(actor, "member.create");
  if (input.role !== "student" && input.planCode !== null) {
    throw invalid("プランを割り当てられるのは生徒だけです。ロールを生徒にするか、プランを空にしてください");
  }
  const userId = context.newId();
  const now = context.now();
  const result = await context.store.createMember({
    publicProfile: { userId, displayName: input.displayName, avatarKey: "default", ageBand: input.ageBand, role: input.role },
    privateProfile: { userId, fullName: input.fullName, email: input.email, createdAt: now.toISOString(), deletedAt: null },
  });
  if (result.outcome === "email_taken") {
    throw conflict("このメールアドレスはすでに使われています。別のメールアドレスにするか、既存の会員を確認してください");
  }
  if (input.planCode !== null) {
    await context.store.replaceMembership({ userId, planCode: input.planCode, assignedBy: admin.userId, now });
  }
  await recordAudit(context, admin, { action: "member.create", targetType: "user", targetId: userId, metadata: { role: input.role, planCode: input.planCode } });
  return { userId };
}

export async function assignPlan(context: ServiceContext, actor: Actor | null, input: { userId: UserId; planCode: PlanCode | null }): Promise<void> {
  const admin = requireAdmin(actor, "member.plan_assign");
  const target = await context.store.getPublicProfile(input.userId);
  if (!target) throw notFound("member.plan_assign");
  if (target.role !== "student") throw invalid("プランを割り当てられるのは生徒だけです");
  if (input.planCode !== null && !findPlan(await context.store.listPlans(), input.planCode)) throw invalid("そのプランは見つかりません。一覧からえらんでください");

  const before = await context.store.getActiveMembership(input.userId);
  await context.store.replaceMembership({ userId: input.userId, planCode: input.planCode, assignedBy: admin.userId, now: context.now() });
  await recordAudit(context, admin, {
    action: "member.plan_assign",
    targetType: "user",
    targetId: input.userId,
    metadata: { from: before?.planCode ?? null, to: input.planCode },
  });
}

/**
 * 退会処理。個人情報を消して行は残す（domain/members.ts の方針）。
 * 表示名の打ち直しで誤操作を防ぐ。
 */
export async function deleteMember(context: ServiceContext, actor: Actor | null, input: { userId: UserId; confirmDisplayName: string }): Promise<void> {
  const admin = requireAdmin(actor, "member.delete");
  const [publicProfile, privateProfile] = await Promise.all([context.store.getPublicProfile(input.userId), context.store.getPrivateProfile(input.userId)]);
  if (!publicProfile || !privateProfile) throw notFound("member.delete");

  const check = checkMemberDeletion({
    actorId: admin.userId,
    target: { userId: publicProfile.userId, role: publicProfile.role, displayName: publicProfile.displayName, deletedAt: privateProfile.deletedAt },
    confirmDisplayName: input.confirmDisplayName,
    activeAdminCount: await context.store.countActiveAdmins(),
  });
  const message = describeMemberDeletionCheck(check);
  if (message !== null) throw invalid(message, "member.delete:check");

  const now = context.now();
  await context.store.applyMemberDeletion({ publicProfile: anonymizePublicProfile(publicProfile), privateProfile: erasePrivateProfile(privateProfile, now) });
  // 監査ログには誰を消したかを ID で残す。消した本名を監査ログに書き写すと、消した意味がなくなる
  await recordAudit(context, admin, { action: "member.delete", targetType: "user", targetId: input.userId, metadata: { role: publicProfile.role } });
}
