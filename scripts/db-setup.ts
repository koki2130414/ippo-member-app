/**
 * データベースの準備（Vercel のビルドの最初に走る）。
 * 接続文字列が無ければ何もしない（デモモード・ローカル開発）。
 * マイグレーションはプーラーを通さない直接接続（*_NON_POOLING）を優先する。
 * 2026-11-12: 東京のデータベース（TOKYO_*）へ引っ越し。古いデータベース（DATABASE_URL）が残っていれば中身を1回だけ写す。
 */
import postgres from "postgres";
import { loadMigrations } from "../src/data/sql/migrations";
import { normalizeDatabaseUrl, POSTGRES_JSON_TYPE, toSqlParams } from "../src/data/sql/postgres-shared";
import { copyDatabase } from "../src/data/sql/copy-database";
import { runMigrations, seedBaseContent } from "../src/data/sql/setup";
import type { SqlClient } from "../src/data/sql/sql-client";

function connect(raw: string) {
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
  return { sql, client };
}

/** 直接接続を先に試し、つながらなければプーラー経由にする（Vercel のビルド環境から直接接続が届かないことがあるため） */
async function connectFirst(candidates: (string | undefined)[]) {
  let lastError: unknown = null;
  for (const raw of candidates) {
    if (!raw) continue;
    const connection = connect(raw);
    try {
      await connection.sql.unsafe("select 1");
      return connection;
    } catch (error) {
      lastError = error;
      await connection.sql.end({ timeout: 1 }).catch(() => undefined);
    }
  }
  if (lastError) throw lastError;
  return null;
}

async function main(): Promise<void> {
  const env = process.env;
  const target = await connectFirst([env.TOKYO_POSTGRES_URL_NON_POOLING, env.TOKYO_POSTGRES_URL, env.POSTGRES_URL_NON_POOLING, env.POSTGRES_URL, env.DATABASE_URL]);
  if (!target) {
    console.warn("[db-setup] データベースの接続文字列が無いので、準備を飛ばします（デモモード）");
    return;
  }
  try {
    const applied = await runMigrations(target.client, loadMigrations());
    console.warn(`[db-setup] マイグレーション: ${applied.length === 0 ? "変更なし" : applied.join(", ")}`);

    // 引っ越し: 東京のデータベースを使い、古いデータベース（DATABASE_URL）もまだつながっているときだけ、1回だけ写す
    const usingTokyo = Boolean(env.TOKYO_POSTGRES_URL || env.TOKYO_POSTGRES_URL_NON_POOLING);
    if (usingTokyo && env.DATABASE_URL) {
      const source = await connectFirst([env.DATABASE_URL_UNPOOLED, env.DATABASE_URL]);
      if (source) {
        try {
          const result = await copyDatabase(source.client, target.client);
          if (result.copied) {
            console.warn(`[db-setup] 古いデータベースから写しました: ${result.tables.filter((item) => item.rows > 0).map((item) => `${item.table} ${item.rows}`).join(", ")}`);
          } else {
            console.warn(`[db-setup] 引っ越しは不要（${result.reason ?? ""}）`);
          }
        } finally {
          await source.sql.end({ timeout: 5 });
        }
      }
    }

    await seedBaseContent(target.client);
    console.warn("[db-setup] 初期の中身（プラン・ルール・クラス枠・診断・動画）: 無いものだけ入れました");
  } finally {
    await target.sql.end({ timeout: 5 });
  }
}

main().catch((error: unknown) => {
  console.error("[db-setup] 失敗しました", error instanceof Error ? error.message : error);
  process.exit(1);
});
