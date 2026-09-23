import type { DataStore } from "@/data/data-store";

/**
 * サービスが使う外部依存。時計と ID 採番も外から渡し、テストで「JST の日付の境目」などを再現できるようにする。
 */
export interface ServiceContext {
  store: DataStore;
  now: () => Date;
  newId: () => string;
}

export function createServiceContext(store: DataStore): ServiceContext {
  return { store, now: () => new Date(), newId: () => crypto.randomUUID() };
}
