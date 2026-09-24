import { toJstDate } from "@/domain/jst";
import { computeStreak, isStreakBonusDay } from "@/domain/points";
import type { Actor, UserId, UserRole } from "@/domain/types";
import type { ServiceContext } from "./context";
import { invalid } from "./errors";
import { awardForOwnAction } from "./points-service";

/**
 * デモモードのワンクリックログイン（仕様 10.7）。
 * そのロールの、いちばん最初に登録された（削除されていない）会員としてログインする。
 * 呼び出し側（Server Action）で isDemoMode を必ず確かめる。本番ではこの関数に到達させない。
 */
export async function findDemoAccount(context: ServiceContext, role: UserRole): Promise<UserId> {
  const members = await context.store.listMembers({ role, page: 1, pageSize: 1 });
  const first = members.items[0];
  if (!first) {
    throw invalid(
      role === "admin" ? "運営アカウントがありません。データを初期化してください" : "このロールのデモアカウントがありません。IPPO_SEED=sample で起動すると、サンプルの会員でためせます",
      `demo_login:${role}`,
    );
  }
  return first.userId;
}

/** 生徒がログインした日のポイント（ログイン・連続・7日ボーナス）。どれも冪等なので、何回ログインしても1日1回分 */
export async function recordDailyLogin(context: ServiceContext, actor: Actor): Promise<void> {
  if (actor.role !== "student") return;
  const today = toJstDate(context.now());
  await awardForOwnAction(context, actor, { ruleCode: "login_daily", subject: today });

  const transactions = await context.store.listPointTransactions(actor.userId);
  const loginDates = transactions.filter((transaction) => transaction.reason === "login_daily").map((transaction) => transaction.jstDate);
  const streak = computeStreak(loginDates, today);
  if (streak.currentDays >= 2) await awardForOwnAction(context, actor, { ruleCode: "streak_daily", subject: today });
  if (isStreakBonusDay(streak)) await awardForOwnAction(context, actor, { ruleCode: "streak_bonus_7", subject: today });
}
