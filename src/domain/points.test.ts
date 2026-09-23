import { describe, expect, it } from "vitest";
import { DEFAULT_POINT_RULES, buildIdempotencyKey, computeStreak, decideAward, decideExchange, describeStreak, findPointRule, isStreakBonusDay, sumBalance } from "./points";
import type { PointRule, PointRuleCode } from "./types";

function rule(code: PointRuleCode): PointRule {
  const found = findPointRule(DEFAULT_POINT_RULES, code);
  if (!found) throw new Error(code);
  return found;
}

const now = new Date("2026-09-24T03:00:00Z");

describe("ポイントのルール定義", () => {
  it("固定額のルールはすべて 1pt（差は日次上限でつける）", () => {
    for (const each of DEFAULT_POINT_RULES) {
      if (each.points !== null) expect(each.points).toBe(1);
    }
  });
  it("仕様の日次上限と一致する", () => {
    expect(Object.fromEntries(DEFAULT_POINT_RULES.map((each) => [each.code, each.maxPerDay]))).toEqual({
      login_daily: 1, profile_completed: 1, video_completed: 3, lecture_completed: 3, quiz_passed: 5, diagnosis_completed: 2,
      streak_daily: 1, streak_bonus_7: 1, class_attended: 2, reflection_submitted: 2, personal_menu_done: 3,
      personal_session_done: 2, video_review_submitted: 2, note_submitted: 3, coach_bonus: null, event_participation: null, admin_adjustment: null,
    });
  });
});

describe("decideAward", () => {
  const base = { requestedAmount: null, idempotencyKey: "k", alreadyAwardedWithSameKey: false, awardedTodayForRule: 0, now };

  it("同じキーなら duplicate（冪等）", () => {
    expect(decideAward({ ...base, rule: rule("video_completed"), alreadyAwardedWithSameKey: true })).toEqual({ kind: "duplicate" });
  });
  it("日次上限に達したら断る", () => {
    expect(decideAward({ ...base, rule: rule("video_completed"), awardedTodayForRule: 3 })).toEqual({ kind: "daily_limit_reached", maxPerDay: 3 });
    expect(decideAward({ ...base, rule: rule("video_completed"), awardedTodayForRule: 2 }).kind).toBe("award");
  });
  it("付与日は JST の暦日で記録する", () => {
    const lateNightUtc = new Date("2026-09-24T16:00:00Z"); // JST 9/25 01:00
    expect(decideAward({ ...base, rule: rule("login_daily"), now: lateNightUtc })).toEqual({ kind: "award", amount: 1, jstDate: "2026-09-25" });
  });
  it("固定額のルールは要求額を無視する（1pt ルールで 100pt 取られない）", () => {
    expect(decideAward({ ...base, rule: rule("login_daily"), requestedAmount: 100 })).toMatchObject({ kind: "award", amount: 1 });
  });
  it("任意額のルールは 1〜100 の整数だけ", () => {
    for (const bad of [null, 0, -5, 1.5, 101]) {
      expect(decideAward({ ...base, rule: rule("coach_bonus"), requestedAmount: bad }).kind).toBe("invalid_amount");
    }
    expect(decideAward({ ...base, rule: rule("coach_bonus"), requestedAmount: 5 })).toMatchObject({ kind: "award", amount: 5 });
  });
});

describe("残高と交換", () => {
  it("残高は取引履歴の合計", () => {
    expect(sumBalance([{ amount: 1 }, { amount: 3 }, { amount: -2 }])).toBe(2);
    expect(sumBalance([])).toBe(0);
  });
  it("在庫と残高を確かめる", () => {
    expect(decideExchange({ balance: 10, costPoints: 5, stock: 0 })).toEqual({ kind: "out_of_stock" });
    expect(decideExchange({ balance: 3, costPoints: 5, stock: 1 })).toEqual({ kind: "insufficient_points", shortBy: 2 });
    expect(decideExchange({ balance: 5, costPoints: 5, stock: 1 })).toEqual({ kind: "ok", cost: 5 });
  });
});

describe("冪等キー", () => {
  it("形式を固定する", () => {
    expect(buildIdempotencyKey("video_completed", "u1", "v9")).toBe("video_completed:u1:v9");
  });
  it("subject が空なら例外", () => {
    expect(() => buildIdempotencyKey("login_daily", "u1", "")).toThrow();
  });
});

describe("連続記録（切れても失わない）", () => {
  it("今日まで続いている", () => {
    const state = computeStreak(["2026-09-22", "2026-09-23", "2026-09-24"], "2026-09-24");
    expect(state).toMatchObject({ currentDays: 3, activeToday: true, restartedToday: false, totalActiveDays: 3 });
  });
  it("今日まだ来ていなくても、昨日までの連続は残して見せる", () => {
    expect(computeStreak(["2026-09-22", "2026-09-23"], "2026-09-24")).toMatchObject({ currentDays: 2, activeToday: false });
  });
  it("途切れて今日また来たら「おかえり」。合計日数は減らない", () => {
    const state = computeStreak(["2026-09-01", "2026-09-02", "2026-09-24"], "2026-09-24");
    expect(state).toMatchObject({ currentDays: 1, restartedToday: true, totalActiveDays: 3 });
    expect(describeStreak(state)).toContain("おかえり");
    expect(describeStreak(state)).toContain("3日");
  });
  it("途切れたときの文言に否定語を使わない", () => {
    const text = describeStreak(computeStreak(["2026-09-01"], "2026-09-24"));
    for (const word of ["失", "リセット", "切れ", "0日"]) expect(text).not.toContain(word);
  });
  it("7日ごとにボーナス", () => {
    const seven = ["2026-09-18", "2026-09-19", "2026-09-20", "2026-09-21", "2026-09-22", "2026-09-23", "2026-09-24"];
    expect(isStreakBonusDay(computeStreak(seven, "2026-09-24"))).toBe(true);
    expect(isStreakBonusDay(computeStreak(seven.slice(1), "2026-09-24"))).toBe(false);
  });
});
