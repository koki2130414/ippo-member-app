import "server-only";

/**
 * 実行モードの判定。サーバー専用（"server-only" で、クライアントに import されたらビルドを落とす）。
 *
 * Supabase の3つの値が「すべて」そろったときだけ本番モードにする。
 * 1つだけ書き忘れた状態で本番モードに入ると、半端な設定で動いて原因が分かりにくいので、
 * そろっていなければデモモード、ただし一部だけあるなら起動時に警告を出す。
 */
const SUPABASE_ENV_NAMES = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"] as const;

export type SeedKind = "empty" | "sample";

export function isDemoMode(): boolean {
  return SUPABASE_ENV_NAMES.some((name) => !process.env[name]);
}

export function hasPartialSupabaseConfig(): boolean {
  const present = SUPABASE_ENV_NAMES.filter((name) => Boolean(process.env[name])).length;
  return present > 0 && present < SUPABASE_ENV_NAMES.length;
}

/** 既定は empty。sample は明示したときだけ（架空の子どものデータが本番に出ることを構造的に防ぐ。仕様 12章） */
export function seedKind(): SeedKind {
  return process.env.IPPO_SEED === "sample" ? "sample" : "empty";
}
