import "server-only";

/**
 * 実行モードの判定。サーバー専用（"server-only" で、クライアントに import されたらビルドを落とす）。
 *
 * データベースの接続文字列があれば本番モード（Supabase の Postgres）、無ければデモモード（メモリ）。
 * Vercel の Supabase 連携は POSTGRES_URL（プーラー経由）を入れる。ほかの環境向けに DATABASE_URL も受ける。
 */
export type SeedKind = "empty" | "sample";

export function databaseUrl(): string | null {
  // 2026-11-12: データベースを東京（Supabase・ap-northeast-1）へ移した。TOKYO_ が付いたものを最優先にする
  return process.env.TOKYO_POSTGRES_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL || null;
}

export function isDemoMode(): boolean {
  return databaseUrl() === null;
}

/** 既定は empty。sample は明示したときだけ（架空の子どものデータが本番に出ることを構造的に防ぐ。仕様 12章） */
export function seedKind(): SeedKind {
  return process.env.IPPO_SEED === "sample" ? "sample" : "empty";
}
