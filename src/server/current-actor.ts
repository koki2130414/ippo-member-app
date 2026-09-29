import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { getDataStore } from "@/data";
import { DEMO_IDS } from "@/data/seed/ids";
import { GUEST_COOKIE_NAME, isGuestModeAvailable } from "./guest";
import type { Actor } from "@/domain/types";
import { loadActor } from "./services/actor";
import { createServiceContext, type ServiceContext } from "./services/context";
import { SESSION_COOKIE_NAME } from "./session";
import { resolveSession } from "./services/session-service";

/**
 * 1リクエストの中では同じ Actor を使い回す（React の cache）。
 * 画面の各所で何度呼んでも、DB を読むのは1回だけにするため。
 */
export const getCurrentActor = cache(async (): Promise<Actor | null> => {
  const cookieStore = await cookies();
  const context = getServiceContext();
  const userId = await resolveSession(context, cookieStore.get(SESSION_COOKIE_NAME)?.value);
  if (userId) {
    const actor = await loadActor(context, userId);
    if (actor) return actor;
  }
  // 見学モード: デモモードのときだけ、見学中の印があれば見学用アカウントとして扱う（server/guest.ts）
  if (isGuestModeAvailable() && cookieStore.get(GUEST_COOKIE_NAME)?.value === "1") {
    return loadActor(context, DEMO_IDS.guest);
  }
  return null;
});

export function getServiceContext(): ServiceContext {
  return createServiceContext(getDataStore());
}
