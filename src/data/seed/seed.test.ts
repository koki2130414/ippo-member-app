import { describe, expect, it } from "vitest";
import { createEmptySeed } from "./empty";
import { createSampleSeed } from "./sample";

describe("seed", () => {
  it("empty には運営1人と見学用アカウントだけ。架空の子どもは入らない", () => {
    const state = createEmptySeed();
    expect(state.publicProfiles.map((profile) => [profile.userId, profile.role])).toEqual([["u-admin-0001", "admin"], ["u-guest-0001", "student"]]);
    expect(state.publicProfiles.find((profile) => profile.role === "student")?.displayName).toBe("見学用");
    expect(state.plans).toHaveLength(5);
    expect(state.classRooms).toHaveLength(4);
    expect(state.diagnosisQuestions.length).toBeGreaterThan(0);
    expect(state.lectureCategories.length).toBeGreaterThan(0);
  });

  it("IPPO のクラス動画（42本）は empty にも入り、すべて YouTube 配信として扱う", () => {
    const videos = createEmptySeed().videos;
    expect(videos).toHaveLength(42);
    expect(new Set(videos.map((video) => video.id)).size).toBe(42);
    expect(new Set(videos.map((video) => video.youtubeId)).size).toBe(42);
    for (const video of videos) {
      expect(video.source).toBe("youtube");
      expect(video.youtubeId).toMatch(/^[A-Za-z0-9_-]{11}$/);
      expect(video.storageKey).toBeNull();
      expect(video.muxPlaybackId).toBeNull();
    }
    expect(videos.find((video) => video.youtubeId === "bJDmJon3lRg")).toMatchObject({ category: "soccer_iq", durationSeconds: 3593, title: "ゴール前のオフザボールの準備〜ポジション別②〜（9/27）" });
    // メンタリティ・フィットネスの合同クラスは「メンタリティ」に入り、両方のテーマが説明に書かれる
    expect(videos.find((video) => video.youtubeId === "6kfjyaymopI")).toMatchObject({ category: "mentality", title: "自信の育て方／ぶれない体の土台づくりをしよう（9/20）" });
    expect(videos.find((video) => video.youtubeId === "6kfjyaymopI")?.description).toContain("フィットネス「ぶれない体の土台づくりをしよう」");
  });

  it("sample は毎回まったく同じ内容になる（自動操作の再現性）", () => {
    expect(createSampleSeed()).toEqual(createSampleSeed());
  });

  it("sample の人物は全員、明らかに架空と分かる名前", () => {
    const state = createSampleSeed();
    for (const profile of state.privateProfiles.filter((each) => each.userId !== "u-admin-0001" && each.userId !== "u-guest-0001")) {
      expect(profile.fullName).toContain("架空");
      expect(profile.email?.endsWith("@example.invalid")).toBe(true);
    }
    for (const profile of state.publicProfiles.filter((each) => each.role !== "admin" && each.userId !== "u-guest-0001")) {
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
