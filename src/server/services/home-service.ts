import { toJstDate } from "@/domain/jst";
import { findPlan } from "@/domain/plans";
import { computeStreak, describeStreak, sumBalance, type StreakState } from "@/domain/points";
import type { Actor } from "@/domain/types";
import type { ServiceContext } from "./context";
import { notFound } from "./errors";
import { requireRole } from "./guards";

export interface StudentHomeView {
  displayName: string;
  planName: string | null;
  streak: StreakState;
  streakMessage: string;
  balance: number;
  completedVideoCount: number;
  completedLectureCount: number;
}

/** 生徒のホーム。数字は「自分の積み上げ」だけで、他人との比較は出さない */
export async function getStudentHome(context: ServiceContext, actor: Actor | null): Promise<StudentHomeView> {
  const student = requireRole(actor, ["student"], "home.student");
  const [profile, membership, plans, transactions, videoProgress, lectureProgress] = await Promise.all([
    context.store.getPublicProfile(student.userId),
    context.store.getActiveMembership(student.userId),
    context.store.listPlans(),
    context.store.listPointTransactions(student.userId),
    context.store.listVideoProgress(student.userId),
    context.store.listLectureProgress(student.userId),
  ]);
  if (!profile) throw notFound("home.student");
  const loginDates = transactions.filter((transaction) => transaction.reason === "login_daily").map((transaction) => transaction.jstDate);
  const streak = computeStreak(loginDates, toJstDate(context.now()));
  return {
    displayName: profile.displayName,
    planName: membership ? (findPlan(plans, membership.planCode)?.name ?? null) : null,
    streak,
    streakMessage: describeStreak(streak),
    balance: sumBalance(transactions),
    completedVideoCount: videoProgress.filter((item) => item.completedAt !== null).length,
    completedLectureCount: lectureProgress.filter((item) => item.completedAt !== null).length,
  };
}

export interface GuardianHomeView {
  displayName: string;
  children: { userId: string; displayName: string; planName: string | null; balance: number; completedVideoCount: number }[];
}

/** 保護者のホーム。紐づいた子の分だけを読む（Actor の linkedStudentIds は DB から組み立てたもの） */
export async function getGuardianHome(context: ServiceContext, actor: Actor | null): Promise<GuardianHomeView> {
  const guardian = requireRole(actor, ["guardian"], "home.guardian");
  const [profile, plans] = await Promise.all([context.store.getPublicProfile(guardian.userId), context.store.listPlans()]);
  if (!profile) throw notFound("home.guardian");
  const children = await Promise.all(
    guardian.linkedStudentIds.map(async (studentId) => {
      const [child, membership, transactions, progress] = await Promise.all([
        context.store.getPublicProfile(studentId),
        context.store.getActiveMembership(studentId),
        context.store.listPointTransactions(studentId),
        context.store.listVideoProgress(studentId),
      ]);
      return {
        userId: studentId,
        displayName: child?.displayName ?? "",
        planName: membership ? (findPlan(plans, membership.planCode)?.name ?? null) : null,
        balance: sumBalance(transactions),
        completedVideoCount: progress.filter((item) => item.completedAt !== null).length,
      };
    }),
  );
  return { displayName: profile.displayName, children };
}
