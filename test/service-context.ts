import { MockDataStore } from "@/data/mock/mock-data-store";
import type { MockState } from "@/data/mock/mock-state";
import { createEmptySeed } from "@/data/seed/empty";
import { createSampleSeed } from "@/data/seed/sample";
import { loadActor } from "@/server/services/actor";
import type { ServiceContext } from "@/server/services/context";
import type { Actor } from "@/domain/types";

/** サービスのテスト用。時計を差し替えられるようにし、ID は連番で再現できるようにする */
export function createTestContext(options: { seed?: "empty" | "sample"; now?: string } = {}) {
  const state: MockState = options.seed === "empty" ? createEmptySeed() : createSampleSeed();
  let current = new Date(options.now ?? "2026-09-24T03:00:00.000Z");
  let sequence = 0;
  const context: ServiceContext = {
    store: new MockDataStore(state),
    now: () => new Date(current),
    newId: () => `test-id-${String(++sequence).padStart(4, "0")}`,
  };
  return {
    context,
    state,
    setNow: (iso: string) => {
      current = new Date(iso);
    },
    actorOf: async (userId: string): Promise<Actor> => {
      const actor = await loadActor(context, userId);
      if (!actor) throw new Error(`actor ${userId} not found`);
      return actor;
    },
  };
}
