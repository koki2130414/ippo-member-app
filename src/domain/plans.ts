import { formatJstMonthDay, startOfNextJstMonth } from "./jst";
import type { MonthlyLimit, Plan, PlanCode, PlanFeature, PlanLimits } from "./types";

/**
 * 会員プランの定義と判定。
 *
 * 上限は「月あたりの数値」で持つ（0 = 使えない、null = 無制限）。
 * こうしておくと、運営が「1on1 を月2回に」と決めたときに数値を変えるだけで済み、
 * 分岐（if plan === "personal"）を探し回らなくてよい。
 */

/** 全プラン共通で見放題のもの。ここを変えれば全プランに効く */
const UNLIMITED_FOR_ALL = {
  classVideos: null,
  lectures: null,
  diagnoses: null,
} as const satisfies Pick<PlanLimits, "classVideos" | "lectures" | "diagnoses">;

export const DEFAULT_PLANS: readonly Plan[] = [
  {
    code: "light",
    name: "ライトプラン",
    monthlyPriceYen: 2980,
    sortOrder: 1,
    limits: { classSlots: 0, personalMenu: 0, personalSessions: 0, videoReviews: 0, notes: 0, ...UNLIMITED_FOR_ALL },
  },
  {
    code: "balance",
    name: "バランスプラン",
    monthlyPriceYen: 4980,
    sortOrder: 2,
    limits: { classSlots: 1, personalMenu: 0, personalSessions: 0, videoReviews: 0, notes: 4, ...UNLIMITED_FOR_ALL },
  },
  {
    code: "soccer_iq",
    name: "サッカーIQプラン",
    monthlyPriceYen: 5480,
    sortOrder: 3,
    limits: { classSlots: 3, personalMenu: 0, personalSessions: 0, videoReviews: 0, notes: 4, ...UNLIMITED_FOR_ALL },
  },
  {
    code: "personal",
    name: "パーソナルプラン",
    monthlyPriceYen: 6980,
    sortOrder: 4,
    limits: { classSlots: 1, personalMenu: null, personalSessions: 1, videoReviews: 2, notes: null, ...UNLIMITED_FOR_ALL },
  },
  {
    code: "professional",
    name: "プロフェッショナルプラン",
    monthlyPriceYen: 12480,
    sortOrder: 5,
    limits: { classSlots: null, personalMenu: null, personalSessions: 2, videoReviews: 4, notes: null, ...UNLIMITED_FOR_ALL },
  },
];

/** 画面に出すときの機能名。子ども向けにひらがなを多めにする */
export const FEATURE_LABELS: Record<PlanFeature, string> = {
  classSlots: "クラス",
  personalMenu: "こべつメニュー",
  personalSessions: "1on1",
  videoReviews: "プレー動画レビュー",
  notes: "サッカーノート",
  classVideos: "クラス動画",
  lectures: "講義",
  diagnoses: "サッカーIQ診断",
};

/**
 * 利用判定の結果。「使えません」で終わらせないため、理由を3つに分けて返す（仕様 2章）。
 * - no_plan: 未加入 → 加入をすすめる
 * - not_in_plan: 今のプランに含まれない → どのプランから使えるかを示す
 * - monthly_limit_reached: 今月の上限 → いつからまた使えるかを示す
 */
export type Entitlement =
  | { status: "available"; feature: PlanFeature; remainingThisMonth: number | null }
  | { status: "no_plan"; feature: PlanFeature; cheapestPlan: Plan | null }
  | { status: "not_in_plan"; feature: PlanFeature; cheapestPlan: Plan | null }
  | { status: "monthly_limit_reached"; feature: PlanFeature; limit: number; resetsAt: Date };

export interface EvaluateInput {
  /** 未加入なら null */
  plan: Plan | null;
  feature: PlanFeature;
  /** JST の今月にすでに使った回数。呼び出し側が jst.ts で数えて渡す */
  usedThisMonth: number;
  allPlans: readonly Plan[];
  now: Date;
}

export function isUnlimited(limit: MonthlyLimit): limit is null {
  return limit === null;
}

export function evaluate({ plan, feature, usedThisMonth, allPlans, now }: EvaluateInput): Entitlement {
  if (plan === null) {
    return { status: "no_plan", feature, cheapestPlan: cheapestPlanWith(allPlans, feature) };
  }
  const limit = plan.limits[feature];
  if (isUnlimited(limit)) {
    return { status: "available", feature, remainingThisMonth: null };
  }
  if (limit <= 0) {
    return { status: "not_in_plan", feature, cheapestPlan: cheapestPlanWith(allPlans, feature) };
  }
  // 使用回数が負になることは無いはずだが、データ不整合で「残り回数が上限より多い」表示にならないよう 0 に丸める
  const used = Math.max(0, usedThisMonth);
  if (used >= limit) {
    return { status: "monthly_limit_reached", feature, limit, resetsAt: startOfNextJstMonth(now) };
  }
  return { status: "available", feature, remainingThisMonth: limit - used };
}

/** その機能が使えるプランのうち、いちばん安いもの。「◯◯プランから使えます」を言うために使う */
export function cheapestPlanWith(plans: readonly Plan[], feature: PlanFeature): Plan | null {
  let cheapest: Plan | null = null;
  for (const candidate of plans) {
    const limit = candidate.limits[feature];
    const includesFeature = limit === null || limit > 0;
    if (!includesFeature) continue;
    if (cheapest === null || candidate.monthlyPriceYen < cheapest.monthlyPriceYen) {
      cheapest = candidate;
    }
  }
  return cheapest;
}

export interface EntitlementMessage {
  /** 見出し。結果を一言で */
  title: string;
  /** 次の一歩 */
  nextStep: string;
  /** 次の一歩のリンク先。無い場合もある */
  href: string | null;
}

/**
 * 判定結果を子ども向けのことばにする。
 * 画面ごとに文言を書くと言い分けが崩れるので、ここに一本化する。
 */
export function describeEntitlement(entitlement: Entitlement): EntitlementMessage {
  const featureLabel = FEATURE_LABELS[entitlement.feature];
  switch (entitlement.status) {
    case "available":
      return {
        title: entitlement.remainingThisMonth === null ? `${featureLabel}が使えます` : `今月はあと${entitlement.remainingThisMonth}回使えます`,
        nextStep: "さっそくやってみよう",
        href: null,
      };
    case "no_plan":
      return {
        title: "プランに加入すると使えます",
        nextStep: "おうちの人といっしょに、プランを見てみよう",
        href: "/plans",
      };
    case "not_in_plan":
      return {
        title: entitlement.cheapestPlan ? `${featureLabel}は${entitlement.cheapestPlan.name}から使えます` : `${featureLabel}は今のプランには入っていません`,
        nextStep: "プランのちがいを見てみよう",
        href: "/plans",
      };
    case "monthly_limit_reached":
      return {
        title: "今月はここまで。来月また使えます",
        nextStep: `${formatJstMonthDay(entitlement.resetsAt)}からまた使えるよ`,
        href: null,
      };
  }
}

export function findPlan(plans: readonly Plan[], code: PlanCode): Plan | null {
  return plans.find((plan) => plan.code === code) ?? null;
}

export function listPlansForDisplay(plans: readonly Plan[] = DEFAULT_PLANS): Plan[] {
  return [...plans].sort((a, b) => a.sortOrder - b.sortOrder);
}

/** 料金表のセル表示。0 は「×」ではなく「—」にして、否定的に見えすぎないようにする */
export function formatLimitForDisplay(limit: MonthlyLimit): string {
  if (limit === null) return "無制限";
  if (limit === 0) return "—";
  return `月${limit}回`;
}
