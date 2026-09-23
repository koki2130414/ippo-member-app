import { z } from "zod";
import { AGE_BANDS, ATTENDANCE_STATUSES, PLAN_CODES, USER_ROLES, VIDEO_CATEGORIES } from "./types";

/**
 * 入力スキーマ。クライアントのフォーム（React Hook Form）とサーバーの Server Action で同じものを使う。
 * クライアント側の検証は「すぐに気づける」ためのもので、信用はしない。サーバーで必ずもう一度 parse する。
 *
 * エラー文は「何がだめか」と「どうすればいいか」を書く（仕様 2章）。
 */

const trimmed = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${label}を入力してください`)
    .max(max, `${label}は${max}文字までにしてください`);

/** 表示名。本名を入れないよう画面で案内するが、ここでは長さと記号だけを見る */
export const displayNameSchema = trimmed("表示名", 20).refine((value) => !/[<>]/.test(value), "表示名に < や > は使えません");

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email("メールアドレスの形をたしかめてください"));

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "パスワードを入力してください"),
});

export const memberCreateSchema = z.object({
  displayName: displayNameSchema,
  fullName: trimmed("お名前", 60),
  email: emailSchema,
  role: z.enum(USER_ROLES, "ロールを選んでください"),
  // 生徒以外（保護者・コーチ・運営）はプランを持たないので空を許す
  planCode: z.enum(PLAN_CODES).nullable(),
  ageBand: z.enum(AGE_BANDS).nullable(),
});
export type MemberCreateInput = z.infer<typeof memberCreateSchema>;

export const memberDeleteSchema = z.object({
  userId: z.string().min(1),
  // 誤操作を防ぐため、運営に表示名を打ち直してもらう
  confirmDisplayName: z.string().trim().min(1, "確認のため表示名を入力してください"),
});

export const planAssignSchema = z.object({
  userId: z.string().min(1),
  planCode: z.enum(PLAN_CODES, "プランを選んでください").nullable(),
});

export const parentStudentLinkSchema = z.object({
  guardianId: z.string().min(1),
  studentId: z.string().min(1),
});

/** YouTube の動画ID は 11 文字。URL を貼られたときに備えて、画面側で ID を取り出してから渡す */
export const youtubeIdSchema = z.string().regex(/^[A-Za-z0-9_-]{11}$/, "YouTube の動画IDは11文字です。URL の v= のあとをコピーしてください");

const videoBaseSchema = z.object({
  title: trimmed("タイトル", 80),
  description: z.string().trim().max(1000, "説明は1000文字までにしてください"),
  category: z.enum(VIDEO_CATEGORIES, "カテゴリーを選んでください"),
  durationSeconds: z.coerce.number().int().min(1, "長さ（秒）を入力してください").max(4 * 60 * 60),
});

/** 配信元ごとに必要な項目が違うので、source で分ける。YouTube だけ「外でも見られる」ことの確認を必須にする */
export const videoCreateSchema = z.discriminatedUnion("source", [
  videoBaseSchema.extend({
    source: z.literal("upload"),
    storageKey: z.string().min(1, "動画ファイルをアップロードしてください"),
  }),
  videoBaseSchema.extend({
    source: z.literal("mux"),
    muxPlaybackId: z.string().regex(/^[A-Za-z0-9]{10,64}$/, "Mux の Playback ID の形をたしかめてください"),
  }),
  videoBaseSchema.extend({
    source: z.literal("youtube"),
    youtubeId: youtubeIdSchema,
    acknowledgedPublicExposure: z.literal(true, "YouTube の動画はアプリの外でも見られます。確認のチェックを入れてください"),
  }),
]);
export type VideoCreateInput = z.infer<typeof videoCreateSchema>;

export const noteReplySchema = z.object({
  noteId: z.string().min(1),
  reply: trimmed("返信", 2000),
});

export const videoReviewReplySchema = z.object({
  reviewId: z.string().min(1),
  reply: trimmed("返信", 2000),
});

export const noteSubmitSchema = z.object({
  comment: z.string().trim().max(500, "ひとことは500文字までにしてね"),
});

export const reflectionSchema = z.object({
  sessionId: z.string().min(1),
  body: z.string().trim().min(1, "ふりかえりを書いてみよう").max(1000, "1000文字までにしてね"),
});

export const attendanceRecordSchema = z.object({
  sessionId: z.string().min(1),
  records: z
    .array(z.object({ studentId: z.string().min(1), status: z.enum(ATTENDANCE_STATUSES) }))
    .min(1, "出欠を1人以上えらんでください"),
});

export const announcementCreateSchema = z.object({
  title: trimmed("タイトル", 80),
  body: trimmed("本文", 4000),
  audience: z.enum(["all", ...USER_ROLES], "だれに向けたお知らせかを選んでください"),
});

/** 回答は設問ID→選択肢ID。数は上限を決めておき、巨大な入力で採点を重くさせない */
export const answersSchema = z.record(z.string().min(1).max(64), z.string().min(1).max(64)).refine((value) => Object.keys(value).length <= 200, "回答が多すぎます");

export const quizSubmissionSchema = z.object({ lectureId: z.string().min(1), answers: answersSchema });
export const diagnosisSubmissionSchema = z.object({ diagnosisId: z.string().min(1), answers: answersSchema });

export const pointGrantSchema = z.object({
  studentId: z.string().min(1),
  ruleCode: z.enum(["coach_bonus", "event_participation", "admin_adjustment", "class_attended", "personal_session_done"]),
  amount: z.coerce.number().int().min(1, "1以上の数にしてください").max(100, "一度に100ptまでにしてください"),
  /** 同じ操作の二重送信を防ぐため、フォームを開いたときに作った ID を送ってもらう */
  requestId: z.uuid(),
  note: z.string().trim().max(200).optional(),
});

export const chatMessageSchema = z.object({
  roomId: z.string().min(1),
  body: trimmed("メッセージ", 1000),
});

export const exchangeSchema = z.object({
  itemId: z.string().min(1),
  requestId: z.uuid(),
});

/** 一覧のクエリ（?page=2&tab=mentality）。URL は利用者がいじれるので、ここで必ず正規化する（仕様 10.3） */
export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
  tab: z.string().max(32).optional().catch(undefined),
});
