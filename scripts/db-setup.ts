/**
 * データベースの準備（Vercel のビルドの最初に走る）。
 * 接続文字列が無ければ何もしない（デモモード・ローカル開発）。
 * マイグレーションはプーラーを通さない直接接続（POSTGRES_URL_NON_POOLING）を優先する。
 */
import postgres from "postgres";
import { loadMigrations } from "../src/data/sql/migrations";
import { normalizeDatabaseUrl, POSTGRES_JSON_TYPE, toSqlParams } from "../src/data/sql/postgres-shared";
import { runMigrations, seedBaseContent } from "../src/data/sql/setup";
import type { SqlClient } from "../src/data/sql/sql-client";

async function main(): Promise<void> {
  const raw = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!raw) {
    console.warn("[db-setup] データベースの接続文字列が無いので、準備を飛ばします（デモモード）");
    return;
  }
  const { url, ssl } = normalizeDatabaseUrl(raw);
  const sql = postgres(url, { max: 1, prepare: false, types: { json: POSTGRES_JSON_TYPE }, connect_timeout: 15, ...(ssl ? { ssl: "require" } : {}) });
  const client: SqlClient = {
    query: async <T,>(text: string, params: readonly unknown[] = []) => [...(await sql.unsafe<T[]>(text, toSqlParams(params)))],
    exec: async (script: string) => {
      await sql.unsafe(script).simple();
    },
    transaction: async <T,>(work: (client: SqlClient) => Promise<T>) => {
      // ビルド時は接続1本だけなので、begin/commit を文として流す
      await sql.unsafe("begin");
      try {
        const result = await work(client);
        await sql.unsafe("commit");
        return result;
      } catch (error) {
        await sql.unsafe("rollback");
        throw error;
      }
    },
  };
  try {
    const applied = await runMigrations(client, loadMigrations());
    console.warn(`[db-setup] マイグレーション: ${applied.length === 0 ? "変更なし" : applied.join(", ")}`);
    await seedBaseContent(client);
    console.warn("[db-setup] 初期の中身（プラン・ルール・クラス枠・診断・動画）: 無いものだけ入れました");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error: unknown) => {
  console.error("[db-setup] 失敗しました", error instanceof Error ? error.message : error);
  process.exit(1);
});
