import { evaluate, findPlan, type Entitlement } from "@/domain/plans";
import type { Actor, Plan, PlanFeature } from "@/domain/types";
import type { ServiceContext } from "./context";

/**
 * 「この人は、この機能を使えるか」をプランから判定する。
 * 生徒は自分のプラン。保護者は、紐づいた子のうち誰か1人でも使えれば使える（子どもといっしょに見る想定）。
 * コーチ・運営は会員向け機能のプラン判定の対象外（それぞれの画面を使う）。
 */
export async function evaluateAccess(context: ServiceContext, actor: Actor, feature: PlanFeature, usedThisMonth = 0): Promise<Entitlement> {
  const plans = await context.store.listPlans();
  const now = context.now();
  const planOf = async (userId: string): Promise<Plan | null> => {
    const membership = await context.store.getActiveMembership(userId);
    return membership ? findPlan(plans, membership.planCode) : null;
  };

  if (actor.role === "student") {
    return evaluate({ plan: await planOf(actor.userId), feature, usedThisMonth, allPlans: plans, now });
  }
  if (actor.role === "guardian") {
    const results = await Promise.all(
      actor.linkedStudentIds.map(async (studentId) => evaluate({ plan: await planOf(studentId), feature, usedThisMonth: 0, allPlans: plans, now })),
    );
    return results.find((result) => result.status === "available") ?? results[0] ?? evaluate({ plan: null, feature, usedThisMonth: 0, allPlans: plans, now });
  }
  return evaluate({ plan: null, feature, usedThisMonth: 0, allPlans: plans, now });
}
