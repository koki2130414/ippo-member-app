/**
 * postgres.js（本番の接続）で使う小さな道具。アプリ本体とビルド時のスクリプト（scripts/db-setup.ts）の両方から使うので、
 * "server-only" を付けないファイルに分けている。
 */

/** 接続文字列から、postgres.js が理解できない追加の引数（supa= など）を取り除く */
export function normalizeDatabaseUrl(raw: string): { url: string; ssl: boolean } {
  const parsed = new URL(raw);
  const sslmode = parsed.searchParams.get("sslmode");
  parsed.search = "";
  const isLocal = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  return { url: parsed.toString(), ssl: sslmode ? sslmode !== "disable" : !isLocal };
}

export type SqlParam = string | number | boolean | null;

/** 値をパラメータに変える。配列やオブジェクトは JSON にして渡す（SQL 側で ::jsonb などに変換する） */
export function toSqlParams(params: readonly unknown[]): SqlParam[] {
  return params.map((value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
    return JSON.stringify(value);
  });
}
