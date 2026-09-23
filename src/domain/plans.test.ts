import { describe, expect, it } from "vitest";
import { DEFAULT_PLANS, cheapestPlanWith, describeEntitlement, evaluate, findPlan, formatLimitForDisplay } from "./plans";
import type { Plan, PlanCode } from "./types";

const now = new Date("2026-09-24T03:00:00Z"); // JST 9/24 12:00

function plan(code: PlanCode): Plan {
  const found = findPlan(DEFAULT_PLANS, code);
  if (!found) throw new Error(`plan ${code} missing`);
  return found;
}

describe("evaluate", () => {
  it("未加入なら no_plan を返し、加入をすすめる", () => {
    const result = evaluate({ plan: null, feature: "notes", usedThisMonth: 0, allPlans: DEFAULT_PLANS, now });
    expect(result.status).toBe("no_plan");
    expect(describeEntitlement(result).title).toBe("プランに加入すると使えます");
  });

  it("プランに含まれないなら not_in_plan と、いちばん安い対象プランを返す", () => {
    const result = evaluate({ plan: plan("light"), feature: "notes", usedThisMonth: 0, allPlans: DEFAULT_PLANS, now });
    expect(result).toMatchObject({ status: "not_in_plan", cheapestPlan: { code: "balance" } });
    expect(describeEntitlement(result).title).toBe("サッカーノートはバランスプランから使えます");
  });

  it("上限に達したら monthly_limit_reached と、翌月1日 0:00 JST を返す", () => {
    const result = evaluate({ plan: plan("personal"), feature: "videoReviews", usedThisMonth: 2, allPlans: DEFAULT_PLANS, now });
    expect(result.status).toBe("monthly_limit_reached");
    if (result.status !== "monthly_limit_reached") return;
    expect(result.resetsAt.toISOString()).toBe("2026-09-30T15:00:00.000Z");
    const message = describeEntitlement(result);
    expect(message.title).toBe("今月はここまで。来月また使えます");
    expect(message.nextStep).toContain("10月1日");
  });

  it("3つの「使えない」理由の文言はすべて違う", () => {
    const titles = new Set([
      describeEntitlement(evaluate({ plan: null, feature: "notes", usedThisMonth: 0, allPlans: DEFAULT_PLANS, now })).title,
      describeEntitlement(evaluate({ plan: plan("light"), feature: "notes", usedThisMonth: 0, allPlans: DEFAULT_PLANS, now })).title,
      describeEntitlement(evaluate({ plan: plan("balance"), feature: "notes", usedThisMonth: 4, allPlans: DEFAULT_PLANS, now })).title,
    ]);
    expect(titles.size).toBe(3);
    for (const title of titles) expect(title).not.toContain("使えません");
  });

  it("残り回数を返す", () => {
    const result = evaluate({ plan: plan("balance"), feature: "notes", usedThisMonth: 1, allPlans: DEFAULT_PLANS, now });
    expect(result).toEqual({ status: "available", feature: "notes", remainingThisMonth: 3 });
  });

  it("null は無制限", () => {
    const result = evaluate({ plan: plan("professional"), feature: "classSlots", usedThisMonth: 999, allPlans: DEFAULT_PLANS, now });
    expect(result).toEqual({ status: "available", feature: "classSlots", remainingThisMonth: null });
  });

  it("全プランでクラス動画・講義・診断は見放題", () => {
    for (const each of DEFAULT_PLANS) {
      for (const feature of ["classVideos", "lectures", "diagnoses"] as const) {
        expect(evaluate({ plan: each, feature, usedThisMonth: 100, allPlans: DEFAULT_PLANS, now }).status).toBe("available");
      }
    }
  });

  it("上限を数値で変えるだけで挙動が変わる（フラグ地獄にしない）", () => {
    const modified: Plan = { ...plan("personal"), limits: { ...plan("personal").limits, personalSessions: 2 } };
    expect(evaluate({ plan: modified, feature: "personalSessions", usedThisMonth: 1, allPlans: DEFAULT_PLANS, now }).status).toBe("available");
  });
});

describe("cheapestPlanWith", () => {
  it("価格の安い順に探す（配列の並び順に依存しない）", () => {
    const shuffled = [...DEFAULT_PLANS].reverse();
    expect(cheapestPlanWith(shuffled, "personalSessions")?.code).toBe("personal");
    expect(cheapestPlanWith(shuffled, "classSlots")?.code).toBe("balance");
  });
  it("どのプランにも無ければ null", () => {
    const noNotes = DEFAULT_PLANS.map((each) => ({ ...each, limits: { ...each.limits, notes: 0 } }));
    expect(cheapestPlanWith(noNotes, "notes")).toBeNull();
  });
});

describe("料金表の定義", () => {
  it("仕様の表と一致する", () => {
    const table = DEFAULT_PLANS.map((each) => [each.code, each.monthlyPriceYen, each.limits.classSlots, each.limits.personalMenu, each.limits.personalSessions, each.limits.videoReviews, each.limits.notes]);
    expect(table).toEqual([
      ["light", 2980, 0, 0, 0, 0, 0],
      ["balance", 4980, 1, 0, 0, 0, 4],
      ["soccer_iq", 5480, 3, 0, 0, 0, 4],
      ["personal", 6980, 1, null, 1, 2, null],
      ["professional", 12480, null, null, 2, 4, null],
    ]);
  });
  it("表示用の文言", () => {
    expect(formatLimitForDisplay(null)).toBe("無制限");
    expect(formatLimitForDisplay(0)).toBe("—");
    expect(formatLimitForDisplay(3)).toBe("月3回");
  });
});
