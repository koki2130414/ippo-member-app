import { addJstDays, diffJstDays, toJstDate } from "./jst";
import type { JstDate, PointRule, PointRuleCode, PointTransaction, UserId } from "./types";

/**
 * ポイント制度。
 *
 * - 1行動 = 1pt に揃え、差は「1日あたりの上限」でつける（仕様 8章）。
 *   pt の大小で差をつけると、子どもが「たくさんもらえる行動」だけを選ぶようになるため。
 * - 残高カラムは持たない。取引履歴（ledger）を合計したものが残高。
 * - 二重付与は idempotencyKey で防ぐ。ここ（純粋関数）での判定は「早期に分かるなら断る」ためのもので、
 *   最終的な保証は DB のユニーク制約（mock では insert 時の検査）が持つ。
 */

export const DEFAULT_POINT_RULES: readonly PointRule[] = [
  { code: "login_daily", label: "ログイン", points: 1, maxPerDay: 1, grantedBy: "system" },
  { code: "profile_completed", label: "プロフィールを書いた", points: 1, maxPerDay: 1, grantedBy: "system" },
  { code: "video_completed", label: "クラス動画を見終わった", points: 1, maxPerDay: 3, grantedBy: "system" },
  { code: "lecture_completed", label: "講義を見終わった", points: 1, maxPerDay: 3, grantedBy: "system" },
  { code: "quiz_passed", label: "クイズに合格した", points: 1, maxPerDay: 5, grantedBy: "system" },
  { code: "diagnosis_completed", label: "診断を受けた", points: 1, maxPerDay: 2, grantedBy: "system" },
  { code: "streak_daily", label: "続けてログイン", points: 1, maxPerDay: 1, grantedBy: "system" },
  { code: "streak_bonus_7", label: "7日つづいた", points: 1, maxPerDay: 1, grantedBy: "system" },
  { code: "class_attended", label: "クラスに出た", points: 1, maxPerDay: 2, grantedBy: "coach" },
  { code: "reflection_submitted", label: "ふりかえりを書いた", points: 1, maxPerDay: 2, grantedBy: "system" },
  { code: "personal_menu_done", label: "こべつメニューをやった", points: 1, maxPerDay: 3, grantedBy: "system" },
  { code: "personal_session_done", label: "1on1を受けた", points: 1, maxPerDay: 2, grantedBy: "coach" },
  { code: "video_review_submitted", label: "プレー動画を出した", points: 1, maxPerDay: 2, grantedBy: "system" },
  { code: "note_submitted", label: "サッカーノートを出した", points: 1, maxPerDay: 3, grantedBy: "system" },
  { code: "coach_bonus", label: "コーチからのプラス", points: null, maxPerDay: null, grantedBy: "coach" },
  { code: "event_participation", label: "イベントに参加した", points: null, maxPerDay: null, grantedBy: "admin" },
  { code: "admin_adjustment", label: "運営からの調整", points: null, maxPerDay: null, grantedBy: "admin" },
];

/**
 * 冪等キーを組み立てる。形式を1か所に固定し、呼び出し側ごとに微妙に違うキーを作って
 * 二重付与の穴が開くのを防ぐ。
 *
 * - 1日1回のもの（login_daily など）は日付を subject にする
 * - 対象があるもの（video_completed など）は対象IDを subject にする
 */
export function buildIdempotencyKey(rule: PointRuleCode, userId: UserId, subject: string): string {
  if (subject.length === 0) {
    // subject が空だと「その人のそのルールは一生1回」になってしまう。意図しない付与漏れを防ぐため弾く
    throw new Error("idempotency の subject が空です");
  }
  return `${rule}:${userId}:${subject}`;
}

export type AwardDecision =
  | { kind: "award"; amount: number; jstDate: JstDate }
  | { kind: "duplicate" }
  | { kind: "daily_limit_reached"; maxPerDay: number }
  | { kind: "invalid_amount" };

export interface DecideAwardInput {
  rule: PointRule;
  /** points が null のルール（コーチ加点など）のときだけ使う */
  requestedAmount: number | null;
  idempotencyKey: string;
  /** その利用者の既存取引のうち、同じキーを持つものがあるか */
  alreadyAwardedWithSameKey: boolean;
  /** その利用者が「同じルール」で「今日（JST）」すでに受けた回数 */
  awardedTodayForRule: number;
  now: Date;
}

/** 付与してよいかを決める。副作用は持たない（書き込みはサービス層） */
export function decideAward(input: DecideAwardInput): AwardDecision {
  const { rule, requestedAmount, alreadyAwardedWithSameKey, awardedTodayForRule, now } = input;
  if (alreadyAwardedWithSameKey) return { kind: "duplicate" };

  const amount = rule.points ?? requestedAmount;
  // 任意額のルールでも、負の付与や小数・極端な値はここで止める。引き落としは交換の経路でしか起こさない
  if (amount === null || !Number.isInteger(amount) || amount <= 0 || amount > 100) {
    return { kind: "invalid_amount" };
  }
  if (rule.maxPerDay !== null && awardedTodayForRule >= rule.maxPerDay) {
    return { kind: "daily_limit_reached", maxPerDay: rule.maxPerDay };
  }
  return { kind: "award", amount, jstDate: toJstDate(now) };
}

/** 残高 = 取引履歴の合計。残高カラムを持たないので、必ずこれを通す */
export function sumBalance(transactions: readonly Pick<PointTransaction, "amount">[]): number {
  return transactions.reduce((total, transaction) => total + transaction.amount, 0);
}

export type ExchangeDecision =
  | { kind: "ok"; cost: number }
  | { kind: "insufficient_points"; shortBy: number }
  | { kind: "out_of_stock" };

/** 交換してよいか。在庫と残高の両方をサーバー側で確かめる（仕様 8章） */
export function decideExchange(input: { balance: number; costPoints: number; stock: number }): ExchangeDecision {
  if (input.stock <= 0) return { kind: "out_of_stock" };
  if (input.balance < input.costPoints) return { kind: "insufficient_points", shortBy: input.costPoints - input.balance };
  return { kind: "ok", cost: input.costPoints };
}

// ---------------------------------------------------------------------------
// 連続記録（ストリーク）
// ---------------------------------------------------------------------------

export interface StreakState {
  /** 今日を含めて何日続いているか。今日まだ来ていなければ昨日までの数 */
  currentDays: number;
  /** 今日すでにログインしたか */
  activeToday: boolean;
  /** 一度途切れて、今日また始めたか。画面で「おかえり」を言うために使う */
  restartedToday: boolean;
  /** これまでの合計日数。途切れても減らない数字を見せ、積み上げを肯定する */
  totalActiveDays: number;
}

/**
 * 連続ログイン日数を数える。
 * 「切れたら失う」形にしないため、合計日数（totalActiveDays）を一緒に返し、画面ではそちらも必ず見せる。
 */
export function computeStreak(activeDates: readonly JstDate[], today: JstDate): StreakState {
  const uniqueDates = new Set(activeDates);
  const activeToday = uniqueDates.has(today);

  let cursor = activeToday ? today : addJstDays(today, -1);
  let currentDays = 0;
  while (uniqueDates.has(cursor)) {
    currentDays += 1;
    cursor = addJstDays(cursor, -1);
  }

  const pastDates = [...uniqueDates].filter((date) => diffJstDays(today, date) > 0);
  const restartedToday = activeToday && currentDays === 1 && pastDates.length > 0;

  return { currentDays, activeToday, restartedToday, totalActiveDays: uniqueDates.size };
}

/** 連続記録を子ども向けのことばにする。途切れても責めない */
export function describeStreak(state: StreakState): string {
  if (state.restartedToday) return `おかえり！また今日から一歩ずつ。これまで${state.totalActiveDays}日がんばってきたよ`;
  if (state.currentDays === 0) return "今日からまた始めよう。いつでもスタートできるよ";
  if (!state.activeToday) return `${state.currentDays}日つづいているよ。今日も来てくれたらうれしいな`;
  return `${state.currentDays}日つづいているよ。これまでの合計は${state.totalActiveDays}日`;
}

/** 7日つづいたボーナスを出す日か。7, 14, 21... 日目に出す */
export function isStreakBonusDay(state: StreakState): boolean {
  return state.activeToday && state.currentDays > 0 && state.currentDays % 7 === 0;
}

export function findPointRule(rules: readonly PointRule[], code: PointRuleCode): PointRule | null {
  return rules.find((rule) => rule.code === code) ?? null;
}
