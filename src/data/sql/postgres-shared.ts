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

/**
 * postgres.js は、サーバーが json / jsonb 型と判断したパラメータを自分で JSON.stringify する。
 * こちらは toSqlParams で先に JSON 文字列にしているので、そのままだと二重にエンコードされて
 * 「配列」ではなく「文字列」の JSON になる（本番のビルドで cannot extract elements from a scalar になった）。
 * 文字列はすでに JSON なのでそのまま渡し、それ以外だけ JSON にする。
 */
export const POSTGRES_JSON_TYPE = {
  to: 114,
  from: [114, 3802],
  serialize: (value: unknown): string => (typeof value === "string" ? value : JSON.stringify(value)),
  parse: (value: string): unknown => JSON.parse(value),
};
