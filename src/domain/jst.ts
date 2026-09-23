import type { IsoDateTime, JstDate, JstMonth } from "./types";

/**
 * JST の暦の計算はすべてここに集める。
 *
 * 実行環境（Vercel は UTC、開発機は JST）のタイムゾーンに結果が左右されないよう、
 * Date のローカル系メソッド（getDate / getMonth など）は使わず、UTC に +9h したうえで UTC 系メソッドで読む。
 * 日本は夏時間が無いので、固定オフセットで正しい。
 */
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

function shiftToJst(instant: Date): Date {
  return new Date(instant.getTime() + JST_OFFSET_MS);
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function toJstDate(instant: Date): JstDate {
  const shifted = shiftToJst(instant);
  return `${shifted.getUTCFullYear()}-${pad2(shifted.getUTCMonth() + 1)}-${pad2(shifted.getUTCDate())}`;
}

export function toJstMonth(instant: Date): JstMonth {
  return toJstDate(instant).slice(0, 7);
}

/** JST のある暦日・時刻を UTC の瞬間に変換する。月や日のはみ出し（13月など）は Date.UTC の繰り上げに任せる */
export function jstWallTimeToUtc(year: number, monthIndex0: number, day: number, hour = 0, minute = 0): Date {
  return new Date(Date.UTC(year, monthIndex0, day, hour, minute) - JST_OFFSET_MS);
}

/** その瞬間が属する JST の月の、月初 0:00（JST）を UTC で返す */
export function startOfJstMonth(instant: Date): Date {
  const shifted = shiftToJst(instant);
  return jstWallTimeToUtc(shifted.getUTCFullYear(), shifted.getUTCMonth(), 1);
}

/** 翌月初 0:00（JST）。「来月また使えます」の日付を出すのに使う */
export function startOfNextJstMonth(instant: Date): Date {
  const shifted = shiftToJst(instant);
  return jstWallTimeToUtc(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, 1);
}

export function startOfJstDay(instant: Date): Date {
  const shifted = shiftToJst(instant);
  return jstWallTimeToUtc(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate());
}

export function isSameJstMonth(a: IsoDateTime | Date, b: Date): boolean {
  const first = typeof a === "string" ? new Date(a) : a;
  return toJstMonth(first) === toJstMonth(b);
}

/** JstDate 同士の日数差（later - earlier）。暦日の差なので時刻は関係しない */
export function diffJstDays(later: JstDate, earlier: JstDate): number {
  const toUtcMidnight = (value: JstDate): number => {
    const [year, month, day] = parseJstDate(value);
    return Date.UTC(year, month - 1, day);
  };
  return Math.round((toUtcMidnight(later) - toUtcMidnight(earlier)) / (24 * 60 * 60 * 1000));
}

export function addJstDays(date: JstDate, days: number): JstDate {
  const [year, month, day] = parseJstDate(date);
  const moved = new Date(Date.UTC(year, month - 1, day + days));
  return `${moved.getUTCFullYear()}-${pad2(moved.getUTCMonth() + 1)}-${pad2(moved.getUTCDate())}`;
}

const JST_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** 形式が崩れた日付で静かに NaN を広げないよう、ここで例外にする */
export function parseJstDate(value: JstDate): [number, number, number] {
  const match = JST_DATE_PATTERN.exec(value);
  if (!match || match[1] === undefined || match[2] === undefined || match[3] === undefined) {
    throw new Error(`JST日付の形式が正しくありません: ${value}`);
  }
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/** 画面表示用「9月24日（木）」。子ども向けなので年は省く */
export function formatJstMonthDay(instant: Date): string {
  const shifted = shiftToJst(instant);
  const weekdayLabels = ["日", "月", "火", "水", "木", "金", "土"];
  return `${shifted.getUTCMonth() + 1}月${shifted.getUTCDate()}日（${weekdayLabels[shifted.getUTCDay()] ?? ""}）`;
}
