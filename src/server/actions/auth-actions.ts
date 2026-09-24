"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { resetDemoData } from "@/data";
import { ROLE_HOME, rolesAllowedForPath } from "@/domain/authorization";
import { USER_ROLES } from "@/domain/types";
import { getServiceContext } from "../current-actor";
import { isDemoMode } from "../env";
import { safeNextPath } from "../page-guards";
import { loadActor } from "../services/actor";
import { findDemoAccount, recordDailyLogin } from "../services/auth-service";
import { ServiceError } from "../services/errors";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS, createSessionToken } from "../session";

export type DemoSignInState = { message: string | null };

const demoSignInSchema = z.object({ role: z.enum(USER_ROLES), next: z.string().max(512).optional() });

/** デモモードのワンクリックログイン。本番モードでは何もせずに断る（画面に出していなくても、直接呼ばれうるので） */
export async function demoSignInAction(_previous: DemoSignInState, formData: FormData): Promise<DemoSignInState> {
  if (!isDemoMode()) return { message: "デモログインは使えません" };
  const parsed = demoSignInSchema.safeParse({ role: formData.get("role"), next: formData.get("next") ?? undefined });
  if (!parsed.success) return { message: "ロールをえらびなおしてください" };

  const context = getServiceContext();
  let destination: string;
  try {
    const userId = await findDemoAccount(context, parsed.data.role);
    const actor = await loadActor(context, userId);
    if (!actor) return { message: "このアカウントではログインできません。データを初期化してから、もう一度ためしてください" };

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, createSessionToken(userId, context.now()), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    await recordDailyLogin(context, actor);

    // 戻り先がそのロールで入れる画面なら戻す。入れない画面なら、ロールのホームへ
    const next = safeNextPath(parsed.data.next);
    const allowed = rolesAllowedForPath(next.split("?")[0] ?? next);
    destination = allowed !== "public" && allowed.includes(actor.role) && parsed.data.next ? next : ROLE_HOME[actor.role];
  } catch (error) {
    if (error instanceof ServiceError) return { message: error.userMessage };
    throw error;
  }
  // redirect は例外で動くので try の外で呼ぶ
  redirect(destination);
}

export async function signOutAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect("/login");
}

/** デモのデータを初期状態に戻す（自動操作を毎回同じ状態から始めるため）。本番では断る */
export async function resetDemoDataAction(): Promise<void> {
  if (!isDemoMode()) return;
  resetDemoData();
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect("/login?reset=1");
}
