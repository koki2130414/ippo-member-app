import { describe, expect, it } from "vitest";
import { describeSchedule, plannedSessions, sessionDayOfMonth, sessionForMonth } from "./schedule";
import type { ClassSchedule } from "./types";

const secondSaturday: ClassSchedule = { weekOfMonth: 2, weekday: 6, startTimeJst: "10:00", durationMinutes: 60 };

describe("クラス開催日", () => {
  it("第2土曜（2026年9月は12日）", () => {
    expect(sessionDayOfMonth(2026, 8, secondSaturday)).toBe(12);
  });
  it("1日がその曜日の月（2026年8月1日は土曜 → 第2土曜は8日）", () => {
    expect(sessionDayOfMonth(2026, 7, secondSaturday)).toBe(8);
  });
  it("第5週が無い月は開催しない", () => {
    // 2026年2月の土曜は 7,14,21,28 の4回
    expect(sessionDayOfMonth(2026, 1, { weekOfMonth: 5, weekday: 6 })).toBeNull();
    // 2026年8月の土曜は 1,8,15,22,29 の5回
    expect(sessionDayOfMonth(2026, 7, { weekOfMonth: 5, weekday: 6 })).toBe(29);
  });
  it("最終週", () => {
    expect(sessionDayOfMonth(2026, 1, { weekOfMonth: "last", weekday: 6 })).toBe(28);
    expect(sessionDayOfMonth(2026, 7, { weekOfMonth: "last", weekday: 6 })).toBe(29);
  });
  it("JST の開始時刻を UTC で保存する", () => {
    const session = sessionForMonth(secondSaturday, "2026-09");
    expect(session?.startsAt.toISOString()).toBe("2026-09-12T01:00:00.000Z");
    expect(session?.endsAt.toISOString()).toBe("2026-09-12T02:00:00.000Z");
  });
  it("JST 早朝の回は UTC では前日になる", () => {
    const session = sessionForMonth({ ...secondSaturday, startTimeJst: "07:30" }, "2026-09");
    expect(session?.startsAt.toISOString()).toBe("2026-09-11T22:30:00.000Z");
  });
  it("年をまたいで数え、無い月は飛ばす", () => {
    const fifthSaturday: ClassSchedule = { ...secondSaturday, weekOfMonth: 5 };
    const sessions = plannedSessions(fifthSaturday, "2026-11", 4); // 11,12,1,2 月
    expect(sessions.map((each) => each.startsAt.toISOString().slice(0, 10))).toEqual(["2027-01-30"]);
  });
  it("時刻の形式が崩れていたら例外", () => {
    expect(() => sessionForMonth({ ...secondSaturday, startTimeJst: "25:00" }, "2026-09")).toThrow();
  });
  it("表示", () => {
    expect(describeSchedule(secondSaturday)).toBe("毎月 第2土曜 10:00〜（60分）");
  });
});
