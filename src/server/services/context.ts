import type { DataStore } from "@/data/data-store";
import { readMuxSigningKey, type MuxSigningKey } from "./mux-signing";

/**
 * サービスが使う外部依存。時計・ID 採番・動画の配信設定も外から渡し、
 * テストで「JST の日付の境目」や「Mux の鍵がある／ない」を再現できるようにする。
 */
export interface ServiceContext {
  store: DataStore;
  now: () => Date;
  newId: () => string;
  media: {
    /** Supabase Storage が使えるか。デモモードでは使えないので、アップロード動画はデモ用の再生にする */
    storageAvailable: boolean;
    muxSigningKey: MuxSigningKey | null;
  };
}

export function createServiceContext(store: DataStore): ServiceContext {
  return {
    store,
    now: () => new Date(),
    newId: () => crypto.randomUUID(),
    media: { storageAvailable: store.kind === "supabase", muxSigningKey: readMuxSigningKey() },
  };
}
