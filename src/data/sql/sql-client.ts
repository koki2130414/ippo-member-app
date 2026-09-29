/**
 * SQL を実行する最小限の窓口。本番は postgres（Supabase の Postgres）、テストは PGlite（メモリ上の Postgres）。
 * どちらも同じ SQL がそのまま動くので、テストで確かめた SQL を本番でも使える。
 */
export interface SqlClient {
  query<T>(text: string, params?: readonly unknown[]): Promise<T[]>;
  /** 複数の文をまとめて流す（マイグレーション用）。値のパラメータは使えない */
  exec(script: string): Promise<void>;
  /** すでにトランザクションの中なら、新しく始めずにそのまま実行する（入れ子にしない） */
  transaction<T>(work: (client: SqlClient) => Promise<T>): Promise<T>;
}

/** PGlite 用（テスト）。型は使う分だけを書き、PGlite 本体への依存をここに閉じ込める */
interface PGliteQueryable {
  query<R>(text: string, params?: unknown[]): Promise<{ rows: R[] }>;
  exec(script: string): Promise<unknown>;
}

interface PGliteLike extends PGliteQueryable {
  transaction<T>(work: (tx: PGliteQueryable) => Promise<T>): Promise<T>;
}

export function pgliteClient(database: PGliteLike): SqlClient {
  const inTransaction = (tx: PGliteQueryable): SqlClient => ({
    query: async <T,>(text: string, params: readonly unknown[] = []) => (await tx.query<T>(text, [...params])).rows,
    exec: async (script: string) => {
      await tx.exec(script);
    },
    transaction: async <T,>(work: (client: SqlClient) => Promise<T>) => work(inTransaction(tx)),
  });
  return {
    query: async <T,>(text: string, params: readonly unknown[] = []) => (await database.query<T>(text, [...params])).rows,
    exec: async (script: string) => {
      await database.exec(script);
    },
    transaction: async <T,>(work: (client: SqlClient) => Promise<T>) => database.transaction((tx) => work(inTransaction(tx))),
  };
}
