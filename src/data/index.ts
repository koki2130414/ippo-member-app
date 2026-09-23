import "server-only";
import { hasPartialSupabaseConfig, isDemoMode, seedKind } from "@/server/env";
import { logger } from "@/server/logger";
import type { DataStore } from "./data-store";
import { MockDataStore } from "./mock/mock-data-store";
import type { MockState } from "./mock/mock-state";
import { createEmptySeed } from "./seed/empty";
import { createSampleSeed } from "./seed/sample";

/**
 * DataStore の入口。環境変数が無ければ mock を返す（仕様 4.2）。
 *
 * mock の状態は globalThis に置く。開発サーバーのホットリロードでモジュールが読み直されても
 * データが消えないようにするため。ただしサーバーのインスタンスごとのメモリなので、
 * Vercel のように複数インスタンスで動くと、インスタンス間でデータは共有されない（README に明記）。
 */

declare global {
  var __ippoMockState: MockState | undefined;
}

export function createSeedState(kind = seedKind()): MockState {
  return kind === "sample" ? createSampleSeed() : createEmptySeed();
}

let warnedPartialConfig = false;

export function getDataStore(): DataStore {
  if (isDemoMode()) {
    if (hasPartialSupabaseConfig() && !warnedPartialConfig) {
      warnedPartialConfig = true;
      logger.warn("Supabase の環境変数が一部だけ設定されています。すべてそろうまでデモモードで動きます");
    }
    globalThis.__ippoMockState ??= createSeedState();
    return new MockDataStore(globalThis.__ippoMockState);
  }
  // 本番実装は Phase 6。未実装のまま本番モードに入ったら、黙って mock で動かさずに止める
  throw new Error("Supabase DataStore は未実装です（Phase 6）。環境変数を外すとデモモードで動きます");
}

/** デモのデータを seed の状態に戻す。自動操作の前に「毎回同じ状態」を作るため（デモモード専用） */
export function resetDemoData(): void {
  if (!isDemoMode()) throw new Error("本番モードではデータを初期化できません");
  globalThis.__ippoMockState = createSeedState();
}
