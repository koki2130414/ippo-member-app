import "server-only";
import { waitUntil } from "@vercel/functions";
import postgres from "postgres";
import { normalizeDatabaseUrl, POSTGRES_JSON_TYPE, toSqlParams } from "./postgres-shared";
import type { SqlClient } from "./sql-client";

/**
 * 本番用（Supabase の Postgres）。Vercel の Supabase 連携が入れる接続文字列を使う。
 *
 * - prepare: false … Supabase のコネクションプーラー（トランザクションモード）は、名前付きのプリペアドステートメントを使えないため
 * - max を小さく … サーバーレスは同時にたくさん起動するので、1つあたりの接続数を絞ってプールを食いつぶさない
 *
 * 2026-11-12: 画面が固まる（リクエストが300秒のタイムアウトまで返らない）問題への対策。
 *   0. max_pipeline: 1（下の createSql を参照）
 * Vercel の関数は、レスポンスを返すと一時停止される。そのとき開いていた接続は、再開したときには相手側で切られていて、
 * そこにクエリを送ると返事が来ないまま待ち続ける。そこで
 *   1. クエリのあと、アイドル接続が閉じるまで（IDLE_SECONDS + 少し）関数を生かしておく（waitUntil）。
 *      @vercel/functions の attachDatabasePool と同じ考え方（postgres.js は対応していないので自前で行う）
 *   2. それでも返事が来ないクエリは QUERY_TIMEOUT_MS で打ち切り、接続を作りなおす。読み取りだけは1回やりなおす
 */
type Sql = postgres.Sql;
type TransactionSql = postgres.TransactionSql;

const IDLE_SECONDS = 5;
const QUERY_TIMEOUT_MS = 12_000;

declare global {
  var __ippoPostgres: Sql | undefined;
  var __ippoPostgresUrl: string | undefined;
}

let idleWait: { timer: ReturnType<typeof setTimeout>; resolve: () => void } | null = null;

/** 接続が自然に閉じるまで関数を止めない（Vercel 上だけ） */
function keepAliveUntilIdle(): void {
  if (!process.env.VERCEL) return;
  const delay = IDLE_SECONDS * 1000 + 1000;
  if (idleWait) {
    clearTimeout(idleWait.timer);
    const current = idleWait;
    current.timer = setTimeout(() => finishIdleWait(current), delay);
    return;
  }
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  const entry = { timer: setTimeout(() => finishIdleWait(entry), delay), resolve };
  idleWait = entry;
  waitUntil(promise);
}

function finishIdleWait(entry: { resolve: () => void }): void {
  if (idleWait === entry) idleWait = null;
  entry.resolve();
}

/**
 * 1本の接続に複数のクエリを重ねて送らない（postgres.js の既定は100件まで重ねる）。
 * Supabase のプーラー（Supavisor・トランザクションモード）は、重ねて送ったクエリへの返事が返らないことがある（画面が固まった原因）。
 * postgres.js の型定義に無いオプションなので、ここで別に渡す
 */
const PIPELINE_OPTIONS: Record<string, number> = { max_pipeline: 1 };

function createSql(rawUrl: string): Sql {
  const { url, ssl } = normalizeDatabaseUrl(rawUrl);
  return postgres(url, {
    prepare: false,
    types: { json: POSTGRES_JSON_TYPE },
    max: 3,
    ...PIPELINE_OPTIONS,
    idle_timeout: IDLE_SECONDS,
    max_lifetime: 60 * 5,
    connect_timeout: 10,
    ...(ssl ? { ssl: "require" } : {}),
  });
}

function currentSql(): Sql {
  if (!globalThis.__ippoPostgres) {
    if (!globalThis.__ippoPostgresUrl) throw new Error("データベースの接続先がありません");
    globalThis.__ippoPostgres = createSql(globalThis.__ippoPostgresUrl);
  }
  return globalThis.__ippoPostgres;
}

/** 返事の来ない接続を捨てる。次のクエリで新しく作られる */
function resetPool(broken: Sql): void {
  if (globalThis.__ippoPostgres === broken) globalThis.__ippoPostgres = undefined;
  void broken.end({ timeout: 0 }).catch(() => undefined);
}

class QueryTimeoutError extends Error {
  constructor() {
    super("データベースから返事がありませんでした");
    this.name = "QueryTimeoutError";
  }
}

async function withTimeout<T>(work: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new QueryTimeoutError()), QUERY_TIMEOUT_MS);
  });
  try {
    return await Promise.race([work, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

const isReadOnly = (text: string) => /^\s*(select|with)\b/i.test(text) && !/\b(insert|update|delete)\b/i.test(text);

async function runQuery<T>(text: string, params: readonly unknown[] = []): Promise<T[]> {
  const sql = currentSql();
  try {
    const rows = await withTimeout(sql.unsafe<T[]>(text, toSqlParams(params)));
    return [...rows];
  } catch (error) {
    if (!(error instanceof QueryTimeoutError)) throw error;
    resetPool(sql);
    // 書きこみは、相手に届いたかどうか分からないので、やりなおさない（二重に記録しないため）
    if (!isReadOnly(text)) throw error;
    const rows = await withTimeout(currentSql().unsafe<T[]>(text, toSqlParams(params)));
    return [...rows];
  } finally {
    keepAliveUntilIdle();
  }
}

function wrapTransaction(tx: TransactionSql): SqlClient {
  return {
    query: async <T,>(text: string, params: readonly unknown[] = []) => [...(await withTimeout(tx.unsafe<T[]>(text, toSqlParams(params))))],
    exec: async (script: string) => {
      await withTimeout(tx.unsafe(script).simple());
    },
    transaction: async <T,>(work: (client: SqlClient) => Promise<T>) => work(wrapTransaction(tx)),
  };
}

const rootClient: SqlClient = {
  query: runQuery,
  exec: async (script: string) => {
    // simple プロトコルなら、複数の文を1回で流せる（パラメータは使えない）
    try {
      await currentSql().unsafe(script).simple();
    } finally {
      keepAliveUntilIdle();
    }
  },
  transaction: async <T,>(work: (client: SqlClient) => Promise<T>) => {
    const sql = currentSql();
    let result: { value: T } | null = null;
    try {
      await sql.begin(async (tx) => {
        result = { value: await work(wrapTransaction(tx)) };
      });
    } catch (error) {
      if (error instanceof QueryTimeoutError) resetPool(sql);
      throw error;
    } finally {
      keepAliveUntilIdle();
    }
    if (result === null) throw new Error("トランザクションの結果を受け取れませんでした");
    const finished: { value: T } = result;
    return finished.value;
  },
};

export function postgresClient(rawUrl: string): SqlClient {
  globalThis.__ippoPostgresUrl = rawUrl;
  return rootClient;
}
