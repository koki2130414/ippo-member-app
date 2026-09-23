import { jstWallTimeToUtc } from "./jst";
import type { ClassSchedule, JstMonth } from "./types";

/**
 * クラスの開催日計算（「第n週の◯曜」）。
 *
 * 「第n週」は「その月の n 回目の◯曜日」と定義する（カレンダーの行番号ではない）。
 * 行番号方式だと、1日が土曜の月に「第1週の日曜」が存在しないなど、保護者の感覚とずれるため。
 * 第5◯曜が無い月は開催しない（振替を勝手に作らない）。
 */

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function parseTime(value: string): { hour: number; minute: number } {
  const match = TIME_PATTERN.exec(value);
  if (!match || match[1] === undefined || match[2] === undefined) {
    throw new Error(`開始時刻の形式が正しくありません: ${value}`);
  }
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

function daysInMonth(year: number, monthIndex0: number): number {
  return new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
}

/** その月の開催日（JST の日にち）。存在しなければ null */
export function sessionDayOfMonth(year: number, monthIndex0: number, schedule: Pick<ClassSchedule, "weekOfMonth" | "weekday">): number | null {
  // 暦の曜日はタイムゾーンに依存しないので UTC で数えてよい
  const firstWeekday = new Date(Date.UTC(year, monthIndex0, 1)).getUTCDay();
  const firstMatchingDay = 1 + ((schedule.weekday - firstWeekday + 7) % 7);
  const lastDay = daysInMonth(year, monthIndex0);

  if (schedule.weekOfMonth === "last") {
    let day = firstMatchingDay;
    while (day + 7 <= lastDay) day += 7;
    return day;
  }
  const day = firstMatchingDay + (schedule.weekOfMonth - 1) * 7;
  return day <= lastDay ? day : null;
}

export interface PlannedSession {
  startsAt: Date;
  endsAt: Date;
}

/** 指定した JST 月の開催回。無い月は null */
export function sessionForMonth(schedule: ClassSchedule, month: JstMonth): PlannedSession | null {
  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const monthIndex0 = Number(monthText) - 1;
  if (!Number.isInteger(year) || !Number.isInteger(monthIndex0) || monthIndex0 < 0 || monthIndex0 > 11) {
    throw new Error(`月の形式が正しくありません: ${month}`);
  }
  const day = sessionDayOfMonth(year, monthIndex0, schedule);
  if (day === null) return null;
  const { hour, minute } = parseTime(schedule.startTimeJst);
  const startsAt = jstWallTimeToUtc(year, monthIndex0, day, hour, minute);
  const endsAt = new Date(startsAt.getTime() + schedule.durationMinutes * 60 * 1000);
  return { startsAt, endsAt };
}

/** fromMonth から数えて count か月ぶんの開催回（無い月は飛ばすので、count 件より少ないことがある） */
export function plannedSessions(schedule: ClassSchedule, fromMonth: JstMonth, monthCount: number): PlannedSession[] {
  const [yearText, monthText] = fromMonth.split("-");
  const startYear = Number(yearText);
  const startMonthIndex0 = Number(monthText) - 1;
  const sessions: PlannedSession[] = [];
  for (let offset = 0; offset < monthCount; offset += 1) {
    const monthDate = new Date(Date.UTC(startYear, startMonthIndex0 + offset, 1));
    const month = `${monthDate.getUTCFullYear()}-${String(monthDate.getUTCMonth() + 1).padStart(2, "0")}`;
    const session = sessionForMonth(schedule, month);
    if (session) sessions.push(session);
  }
  return sessions;
}

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"] as const;

/** 「毎月 第2土曜 10:00〜」のような表示 */
export function describeSchedule(schedule: ClassSchedule): string {
  const week = schedule.weekOfMonth === "last" ? "最終" : `第${schedule.weekOfMonth}`;
  return `毎月 ${week}${WEEKDAY_LABELS[schedule.weekday]}曜 ${schedule.startTimeJst}〜（${schedule.durationMinutes}分）`;
}
