"use server";

import { revalidatePath } from "next/cache";
import { memberCreateFormSchema, planAssignSchema, toMemberCreateInput } from "@/domain/schemas";
import { getCurrentActor, getServiceContext } from "../current-actor";
import { assignPlan, createMember } from "../services/members-service";
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
