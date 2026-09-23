import { describe, expect, it } from "vitest";
import { createEmptySeed } from "./empty";
import { createSampleSeed } from "./sample";

describe("seed", () => {
  it("empty には運営1人だけ。架空の子どもは入らない", () => {
    const state = createEmptySeed();
    expect(state.publicProfiles.map((profile) => profile.role)).toEqual(["admin"]);
    expect(state.plans).toHaveLength(5);
    expect(state.classRooms).toHaveLength(4);
    expect(state.diagnosisQuestions.length).toBeGreaterThan(0);
    expect(state.lectureCategories.length).toBeGreaterThan(0);
  });

  it("sample は毎回まったく同じ内容になる（自動操作の再現性）", () => {
    expect(createSampleSeed()).toEqual(createSampleSeed());
  });

  it("sample の人物は全員、明らかに架空と分かる名前", () => {
    const state = createSampleSeed();
    for (const profile of state.privateProfiles.filter((each) => each.userId !== "u-admin-0001")) {
      expect(profile.fullName).toContain("架空");
      expect(profile.email.endsWith("@example.invalid")).toBe(true);
    }
    for (const profile of state.publicProfiles.filter((each) => each.role !== "admin")) {
      expect(profile.displayName).toContain("サンプル");
    }
  });

  it("seed ごとに状態が独立している（片方を書き換えても、もう片方は変わらない）", () => {
    const first = createEmptySeed();
    const firstPlan = first.plans[0];
    if (firstPlan) firstPlan.limits.notes = 99;
    expect(createEmptySeed().plans[0]?.limits.notes).toBe(0);
  });

  it("診断の正解の位置が偏っていない", () => {
    const positions = new Set(createEmptySeed().diagnosisQuestions.map((question) => question.choices.findIndex((choice) => choice.isCorrect)));
    expect(positions.size).toBeGreaterThan(1);
  });
});
