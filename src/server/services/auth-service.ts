import { isGuestUserId } from "@/data/seed/ids";
import { toJstDate } from "@/domain/jst";
import { normalizeLoginId } from "@/domain/registration";
import { computeStreak, isStreakBonusDay } from "@/domain/points";
import type { Actor, UserId, UserRole } from "@/domain/types";
import type { ServiceContext } from "./context";
import { invalid, ServiceError } from "./errors";
import { burnPasswordCheck, verifyPassword } from "./secrets";
import { startSession } from "./session-service";
import { awardForOwnAction } from "./points-service";

/**
 * デモモードのワンクリックログイン（仕様 10.7）。
 * そのロールの、いちばん最初に登録された（削除されていない）会員としてログインする。
 * 呼び出し側（Server Action）で isDemoMode を必ず確かめる。本番ではこの関数に到達させない。
 */
export async function findDemoAccount(context: ServiceContext, role: UserRole): Promise<UserId> {
  // 見学用アカウントは「見学する」ボタンからだけ入る。ロール別のデモログインでは選ばない
  const members = await context.store.listMembers({ role, page: 1, pageSize: 5 });
  const first = members.items.find((member) => !isGuestUserId(member.userId));
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
  if (actor.role !== "student" || isGuestUserId(actor.userId)) return;
  const today = toJstDate(context.now());
  await awardForOwnAction(context, actor, { ruleCode: "login_daily", subject: today });

  const transactions = await context.store.listPointTransactions(actor.userId);
  const loginDates = transactions.filter((transaction) => transaction.reason === "login_daily").map((transaction) => transaction.jstDate);
  const streak = computeStreak(loginDates, today);
  if (streak.currentDays >= 2) await awardForOwnAction(context, actor, { ruleCode: "streak_daily", subject: today });
  if (isStreakBonusDay(streak)) await awardForOwnAction(context, actor, { ruleCode: "streak_bonus_7", subject: today });
}

const SIGN_IN_FAILED = "メールアドレス（ログインID）かパスワードがちがいます。もう一度たしかめてください";

/**
 * パスワードでログインする。成功したらセッションのトークンを返す（クッキーに入れるのは Server Action 側）。
 * 「IDがちがう」と「パスワードがちがう」を言い分けない（どのIDが存在するかを教えないため）。
 */
export async function signInWithPassword(context: ServiceContext, input: { loginId: string; password: string }): Promise<{ userId: UserId; token: string; expiresAt: Date }> {
  const credential = await context.store.getCredentialByLoginId(normalizeLoginId(input.loginId));
  if (!credential) {
    await burnPasswordCheck(input.password);
    throw new ServiceError("unauthenticated", SIGN_IN_FAILED, "sign_in:unknown_login_id");
  }
  if (!(await verifyPassword(input.password, credential.passwordHash))) {
    throw new ServiceError("unauthenticated", SIGN_IN_FAILED, "sign_in:wrong_password");
  }
  const privateProfile = await context.store.getPrivateProfile(credential.userId);
  if (!privateProfile || privateProfile.deletedAt !== null) throw new ServiceError("unauthenticated", SIGN_IN_FAILED, "sign_in:deleted");
  const session = await startSession(context, credential.userId);
  return { userId: credential.userId, ...session };
}
