import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";
import { copyDatabase } from "./copy-database";
import { loadMigrations } from "./migrations";
import { runMigrations, seedBaseContent } from "./setup";
import { pgliteClient } from "./sql-client";

async function freshDatabase() {
  const client = pgliteClient(new PGlite());
  await runMigrations(client, loadMigrations());
  return client;
}

describe("データベースの引っ越し", { timeout: 60_000 }, () => {
  it.concurrent("会員・申し込み・プラン・見学リンク・担当コーチの書き換えまで写し、2回目は何もしない", async () => {
    const source = await freshDatabase();
    await seedBaseContent(source);
    await source.query("insert into members (user_id, display_name, avatar_key, role, full_name, email, created_at) values ('u1', '運営', 'default', 'admin', '運営 太郎', 'a@example.invalid', now())");
    await source.query("insert into memberships (user_id, plan_code, assigned_by, started_at) values ('u1', 'light', 'u1', now())");
    await source.query("update videos set instructors = '[\"テストコーチ\"]'::jsonb where id = 'video-ippo-bjdmjon3lrg-20260927'");

    const target = await freshDatabase();
    const result = await copyDatabase(source, target);
    expect(result.copied).toBe(true);
    await seedBaseContent(target);

    const [member] = await target.query<{ email: string }>("select email from members where user_id = 'u1'");
    expect(member?.email).toBe("a@example.invalid");
    const [video] = await target.query<{ instructors: string[] }>("select instructors from videos where id = 'video-ippo-bjdmjon3lrg-20260927'");
    expect(video?.instructors).toEqual(["テストコーチ"]);
    const counts = async (client: typeof source) => (await client.query<{ n: number }>("select (select count(*) from videos) + (select count(*) from plans) + (select count(*) from memberships) as n"))[0]?.n;
    expect(Number(await counts(target))).toBe(Number(await counts(source)));
    // 自動採番の続きから振られる
    await target.query("insert into memberships (user_id, plan_code, assigned_by, started_at, ended_at) values ('u1', 'light', 'u1', now(), now())");

    expect((await copyDatabase(source, target)).copied).toBe(false);
  });
});
