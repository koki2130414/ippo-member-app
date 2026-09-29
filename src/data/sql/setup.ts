import { BASE_CLASS_ROOMS, BASE_DIAGNOSIS, BASE_DIAGNOSIS_QUESTIONS, BASE_LECTURE_CATEGORIES, BASE_PLANS, BASE_POINT_RULES, BASE_VIDEOS } from "../seed/base-content";
import type { SqlClient } from "./sql-client";

/**
 * データベースの準備（マイグレーションと、初期の中身）。Vercel のビルドのたびに走る（scripts/db-setup.ts）。
 *
 * - マイグレーションは schema_migrations に記録し、1回だけ流す
 * - 初期の中身（プラン・ポイントのルール・クラス枠・講義カテゴリー・診断・IPPO のクラス動画）は「無ければ入れる」だけ。
 *   運営があとで直した内容を、ビルドのたびに上書きしないため
 * - 人（会員）は1人も入れない。最初の運営は /setup から本人が作る
 */

export interface Migration {
  name: string;
  sql: string;
}

export async function runMigrations(client: SqlClient, migrations: readonly Migration[]): Promise<string[]> {
  await client.query("create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())");
  await client.query("alter table schema_migrations enable row level security");
  const applied = new Set((await client.query<{ name: string }>("select name from schema_migrations")).map((row) => row.name));
  const newlyApplied: string[] = [];
  for (const migration of [...migrations].sort((a, b) => a.name.localeCompare(b.name))) {
    if (applied.has(migration.name)) continue;
    await client.transaction(async (tx) => {
      await tx.exec(migration.sql);
      await tx.query("insert into schema_migrations (name) values ($1)", [migration.name]);
    });
    newlyApplied.push(migration.name);
  }
  return newlyApplied;
}

export async function seedBaseContent(client: SqlClient): Promise<void> {
  await client.transaction(async (tx) => {
    for (const plan of BASE_PLANS) {
      await tx.query("insert into plans (code, name, monthly_price_yen, sort_order, limits) values ($1, $2, $3, $4, $5::jsonb) on conflict (code) do nothing", [
        plan.code,
        plan.name,
        plan.monthlyPriceYen,
        plan.sortOrder,
        JSON.stringify(plan.limits),
      ]);
    }
    for (const rule of BASE_POINT_RULES) {
      await tx.query("insert into point_rules (code, label, points, max_per_day, granted_by) values ($1, $2, $3, $4, $5) on conflict (code) do nothing", [
        rule.code,
        rule.label,
        rule.points,
        rule.maxPerDay,
        rule.grantedBy,
      ]);
    }
    for (const room of BASE_CLASS_ROOMS) {
      await tx.query(
        "insert into class_rooms (id, name, category, description, schedule, coach_ids, capacity) values ($1, $2, $3, $4, $5::jsonb, array(select jsonb_array_elements_text($6::jsonb)), $7) on conflict (id) do nothing",
        [room.id, room.name, room.category, room.description, JSON.stringify(room.schedule), JSON.stringify(room.coachIds), room.capacity],
      );
    }
    for (const category of BASE_LECTURE_CATEGORIES) {
      await tx.query("insert into lecture_categories (id, name, sort_order) values ($1, $2, $3) on conflict (id) do nothing", [category.id, category.name, category.sortOrder]);
    }
    await tx.query("insert into diagnoses (id, title, description, categories) values ($1, $2, $3, $4::jsonb) on conflict (id) do nothing", [
      BASE_DIAGNOSIS.id,
      BASE_DIAGNOSIS.title,
      BASE_DIAGNOSIS.description,
      JSON.stringify(BASE_DIAGNOSIS.categories),
    ]);
    for (const question of BASE_DIAGNOSIS_QUESTIONS) {
      await tx.query(
        "insert into diagnosis_questions (id, diagnosis_id, category_code, prompt, sort_order, choices) values ($1, $2, $3, $4, $5, $6::jsonb) on conflict (id) do nothing",
        [question.id, question.diagnosisId, question.categoryCode, question.prompt, question.sortOrder, JSON.stringify(question.choices)],
      );
    }
    for (const video of BASE_VIDEOS) {
      await tx.query(
        `insert into videos (id, title, description, category, duration_seconds, source, storage_key, mux_playback_id, youtube_id, published_at, created_by)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) on conflict (id) do nothing`,
        [video.id, video.title, video.description, video.category, video.durationSeconds, video.source, video.storageKey, video.muxPlaybackId, video.youtubeId, video.publishedAt, "system"],
      );
    }
  });
}
