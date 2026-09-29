import { z } from "zod";
import {
  AGE_BANDS,
  APPLICATION_STATUSES,
  AUDIT_ACTIONS,
  GRADES,
  PLAN_CODES,
  POINT_RULE_CODES,
  PREFECTURES,
  VIDEO_CATEGORIES,
  VIDEO_SOURCES,
  WEEKDAYS,
} from "@/domain/types";

/**
 * データベースから読んだ値を、ドメインの型に「確かめてから」変換する。
 * 型アサーション（as）で思い込まずに Zod で検証するのは、手で直したデータなどが混ざっていたときに、
 * おかしな値のまま画面や判定に流れないようにするため。
 */

const limit = z.number().int().nonnegative().nullable();
const planLimitsSchema = z.object({
  classSlots: limit,
  personalMenu: limit,
  personalSessions: limit,
  videoReviews: limit,
  notes: limit,
  classVideos: limit,
  lectures: limit,
  diagnoses: limit,
});

const choiceSchema = z.object({ id: z.string(), label: z.string(), isCorrect: z.boolean() });

const scheduleSchema = z.object({
  weekOfMonth: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal("last")]),
  weekday: z.union(WEEKDAYS.map((day) => z.literal(day))),
  startTimeJst: z.string(),
  durationMinutes: z.number().int().positive(),
});

/** jsonb は PGlite ではオブジェクト、ドライバによっては文字列で返るので、どちらでも受ける */
function json(value: unknown): unknown {
  return typeof value === "string" ? JSON.parse(value) : value;
}

export const parseJsonColumn = {
  ageBand: (value: string | null) => (value === null ? null : z.enum(AGE_BANDS).parse(value)),
  grade: (value: string | null) => (value === null ? null : z.enum(GRADES).parse(value)),
  prefecture: (value: string | null) => (value === null ? null : z.enum(PREFECTURES).parse(value)),
  requiredGrade: (value: string) => z.enum(GRADES).parse(value),
  requiredPrefecture: (value: string) => z.enum(PREFECTURES).parse(value),
  applicationStatus: (value: string) => z.enum(APPLICATION_STATUSES).parse(value),
  planCode: (value: string) => z.enum(PLAN_CODES).parse(value),
  pointRuleCode: (value: string) => z.enum(POINT_RULE_CODES).parse(value),
  pointReason: (value: string) => z.union([z.enum(POINT_RULE_CODES), z.literal("exchange")]).parse(value),
  grantedBy: (value: string) => z.enum(["system", "coach", "admin"]).parse(value),
  videoCategory: (value: string) => z.enum(VIDEO_CATEGORIES).parse(value),
  videoSource: (value: string) => z.enum(VIDEO_SOURCES).parse(value),
  auditAction: (value: string) => z.enum(AUDIT_ACTIONS).parse(value),
  auditMetadata: (value: unknown) => z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).parse(json(value)),
  planLimits: (value: unknown) => planLimitsSchema.parse(json(value)),
  choices: (value: unknown) => z.array(choiceSchema).parse(json(value)),
  classSchedule: (value: unknown) => scheduleSchema.parse(json(value)),
  diagnosisCategories: (value: unknown) => z.array(z.object({ code: z.string(), label: z.string() })).parse(json(value)),
  textArray: (value: unknown) => z.array(z.string()).parse(Array.isArray(value) ? value : json(value)),
};
