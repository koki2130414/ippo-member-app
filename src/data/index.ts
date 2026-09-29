import "server-only";
import { databaseUrl, isDemoMode, seedKind } from "@/server/env";
import type { DataStore } from "./data-store";
import { MockDataStore } from "./mock/mock-data-store";
import type { MockState } from "./mock/mock-state";
import { createEmptySeed } from "./seed/empty";
import { createSampleSeed } from "./seed/sample";
import { postgresClient } from "./sql/postgres-client";
import { SqlDataStore } from "./sql/sql-data-store";

/**
 * DataStore の入口。データベースの接続文字列があれば Postgres（Supabase）、無ければメモリ（デモモード）。
 *
 * デモモードの状態は globalThis に置く（開発サーバーのホットリロードで消えないように）。
 * ただしサーバーのインスタンスごとのメモリなので、Vercel では画面ごとにデータがずれることがある（README）。
 */

declare global {
  var __ippoMockState: MockState | undefined;
}

export function createSeedState(kind = seedKind()): MockState {
  return kind === "sample" ? createSampleSeed() : createEmptySeed();
}

export function getDataStore(): DataStore {
  const url = databaseUrl();
  if (url !== null) return new SqlDataStore(postgresClient(url));
  globalThis.__ippoMockState ??= createSeedState();
  return new MockDataStore(globalThis.__ippoMockState);
}

/** デモのデータを seed の状態に戻す（デモモード専用） */
export function resetDemoData(): void {
  if (!isDemoMode()) throw new Error("本番モードではデータを初期化できません");
  globalThis.__ippoMockState = createSeedState();
}
