import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { getDataStore } from "@/data";
import type { Actor } from "@/domain/types";
import { loadActor } from "./services/actor";
import { createServiceContext, type ServiceContext } from "./services/context";
import { SESSION_COOKIE_NAME, verifySessionToken } from "./session";

/**
 * 1リクエストの中では同じ Actor を使い回す（React の cache）。
 * 画面の各所で何度呼んでも、DB を読むのは1回だけにするため。
 */
export const getCurrentActor = cache(async (): Promise<Actor | null> => {
  const cookieStore = await cookies();
  const userId = verifySessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value, new Date());
  if (!userId) return null;
  return loadActor(getServiceContext(), userId);
});

export function getServiceContext(): ServiceContext {
  return createServiceContext(getDataStore());
}
