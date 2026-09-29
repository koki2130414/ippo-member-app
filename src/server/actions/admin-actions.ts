"use server";

import { revalidatePath } from "next/cache";
import { approveApplicationSchema, issueInvitationSchema, memberCreateFormSchema, planAssignSchema, rejectApplicationSchema, toMemberCreateInput } from "@/domain/schemas";
import { getCurrentActor, getServiceContext } from "../current-actor";
import { issueAccountInvitation } from "../services/account-service";
import { assignPlan, createMember } from "../services/members-service";
import { approveApplication, rejectApplication } from "../services/registration-service";
import { runAction } from "./action-result";

/**
 * 運営の操作。フォームからの値はクライアントで検証済みでも、ここでもう一度同じスキーマで検証する。
 * 運営かどうかの判定はサービス層（requireAdmin）で行う。
 */

export async function createMemberAction(values: unknown) {
  const result = await runAction("member.create", async () => {
    const input = toMemberCreateInput(memberCreateFormSchema.parse(values));
    return createMember(getServiceContext(), await getCurrentActor(), input);
  });
  if (result.ok) revalidatePath("/admin/users");
  return result;
}

export async function assignPlanAction(userId: unknown, planCode: unknown) {
  const result = await runAction("member.plan_assign", async () => {
    const input = planAssignSchema.parse({ userId, planCode: planCode === "" ? null : planCode });
    await assignPlan(getServiceContext(), await getCurrentActor(), input);
    return { planCode: input.planCode };
  });
  if (result.ok) revalidatePath("/admin/users");
  return result;
}

/**
 * ログイン用リンクの発行（パスワードの設定・再設定）。
 * リンクのトークンはこのレスポンスでだけ返す。保存しているのはハッシュだけなので、あとから同じリンクは出せない。
 */
export async function issueAccountInvitationAction(userId: unknown) {
  return runAction("invitation.issue", async () => {
    const input = issueInvitationSchema.parse({ userId });
    const issued = await issueAccountInvitation(getServiceContext(), await getCurrentActor(), input);
    return { invitePath: `/invite/${issued.token}`, expiresAt: issued.expiresAt.toISOString() };
  });
}

export async function approveApplicationAction(applicationId: unknown, planCode: unknown) {
  const result = await runAction("application.approve", async () => {
    const input = approveApplicationSchema.parse({ applicationId, planCode: planCode === "" ? null : planCode });
    const approved = await approveApplication(getServiceContext(), await getCurrentActor(), input);
    return { invitePath: `/invite/${approved.invitation.token}`, expiresAt: approved.invitation.expiresAt.toISOString(), reusedGuardian: approved.reusedGuardian };
  });
  // 一覧を読み直さない。読み直すと承認した行が「審査待ち」から消え、1回しか表示できない招待リンクも一緒に消えてしまうため
  return result;
}

export async function rejectApplicationAction(applicationId: unknown, note: unknown) {
  const result = await runAction("application.reject", async () => {
    const input = rejectApplicationSchema.parse({ applicationId, note: typeof note === "string" ? note : undefined });
    await rejectApplication(getServiceContext(), await getCurrentActor(), input);
    return { rejected: true };
  });
  if (result.ok) revalidatePath("/admin/applications");
  return result;
}
