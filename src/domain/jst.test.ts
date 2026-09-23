import { describe, expect, it } from "vitest";
import { addJstDays, diffJstDays, parseJstDate, startOfJstDay, startOfJstMonth, startOfNextJstMonth, toJstDate, toJstMonth } from "./jst";

describe("JST の暦", () => {
  it("UTC 14:59 は JST 23:59（同じ日）、UTC 15:00 は JST 翌日 0:00", () => {
    expect(toJstDate(new Date("2026-09-24T14:59:59Z"))).toBe("2026-09-24");
    expect(toJstDate(new Date("2026-09-24T15:00:00Z"))).toBe("2026-09-25");
  });

  it("月末の境界: UTC では9月でも JST では10月", () => {
    const instant = new Date("2026-09-30T15:00:00Z");
    expect(toJstMonth(instant)).toBe("2026-10");
    expect(startOfJstMonth(instant).toISOString()).toBe("2026-09-30T15:00:00.000Z");
  });

  it("年またぎの翌月初", () => {
    expect(startOfNextJstMonth(new Date("2026-12-31T14:00:00Z")).toISOString()).toBe("2026-12-31T15:00:00.000Z");
    expect(startOfNextJstMonth(new Date("2026-12-31T15:00:00Z")).toISOString()).toBe("2027-01-31T15:00:00.000Z");
  });

  it("日の始まり", () => {
    expect(startOfJstDay(new Date("2026-09-24T20:00:00Z")).toISOString()).toBe("2026-09-24T15:00:00.000Z");
  });

  it("暦日の足し引き（うるう年）", () => {
    expect(addJstDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addJstDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(diffJstDays("2026-10-01", "2026-09-24")).toBe(7);
  });

  it("形式が崩れた日付は例外", () => {
    expect(() => parseJstDate("2026/09/24")).toThrow();
  });

  it("実行環境のタイムゾーンに依存しない（vitest は TZ=America/Los_Angeles で走らせている）", () => {
    expect(process.env.TZ).toBe("America/Los_Angeles");
    expect(toJstDate(new Date("2026-09-24T00:30:00Z"))).toBe("2026-09-24");
  });
});
