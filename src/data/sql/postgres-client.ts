import "server-only";
import postgres from "postgres";
import { normalizeDatabaseUrl, toSqlParams } from "./postgres-shared";
import type { SqlClient } from "./sql-client";

/**
 * 本番用（Supabase の Postgres）。Vercel の Supabase 連携が入れる接続文字列を使う。
 *
 * - prepare: false … Supabase のコネクションプーラー（トランザクションモード）は、名前付きのプリペアドステートメントを使えないため
 * - max を小さく … サーバーレスは同時にたくさん起動するので、1つあたりの接続数を絞ってプールを食いつぶさない
 */
type Sql = postgres.Sql;
type TransactionSql = postgres.TransactionSql;

function wrap(sql: Sql | TransactionSql, inTransaction: boolean): SqlClient {
  return {
    query: async <T,>(text: string, params: readonly unknown[] = []) => {
      const rows = await sql.unsafe<T[]>(text, toSqlParams(params));
      return [...rows];
    },
    exec: async (script: string) => {
      // simple プロトコルなら、複数の文を1回で流せる（パラメータは使えない）
      await sql.unsafe(script).simple();
    },
    transaction: async <T,>(work: (client: SqlClient) => Promise<T>) => {
      if (inTransaction || !("begin" in sql)) return work(wrap(sql, true));
      let result: { value: T } | null = null;
      await sql.begin(async (tx) => {
        result = { value: await work(wrap(tx, true)) };
      });
      if (result === null) throw new Error("トランザクションの結果を受け取れませんでした");
      const finished: { value: T } = result;
      return finished.value;
    },
  };
}

declare global {
  var __ippoPostgres: Sql | undefined;
}

export function postgresClient(rawUrl: string): SqlClient {
  if (!globalThis.__ippoPostgres) {
    const { url, ssl } = normalizeDatabaseUrl(rawUrl);
    globalThis.__ippoPostgres = postgres(url, { prepare: false, max: 3, idle_timeout: 20, connect_timeout: 10, ...(ssl ? { ssl: "require" } : {}) });
  }
  return wrap(globalThis.__ippoPostgres, false);
}
