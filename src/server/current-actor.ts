import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { getDataStore } from "@/data";
import { DEMO_IDS } from "@/data/seed/ids";
import { DEMO_GUEST_COOKIE_VALUE, GUEST_COOKIE_NAME, isGuestModeAvailable } from "./guest";
import { isActiveGuestToken } from "./services/guest-link-service";
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
  // 見学（server/guest.ts）: デモの「見学する」ボタンの印か、今も有効な見学リンクのトークンなら、見学用アカウントとして扱う
  const guestCookie = cookieStore.get(GUEST_COOKIE_NAME)?.value;
  if (guestCookie) {
    const demoGuest = isGuestModeAvailable() && guestCookie === DEMO_GUEST_COOKIE_VALUE;
    if (demoGuest || (await isActiveGuestToken(context, guestCookie))) return loadActor(context, DEMO_IDS.guest);
  }
  return null;
});

export function getServiceContext(): ServiceContext {
  return createServiceContext(getDataStore());
}
