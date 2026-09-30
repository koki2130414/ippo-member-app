"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { resetDemoData } from "@/data";
import { ROLE_HOME, rolesAllowedForPath } from "@/domain/authorization";
import { accountSetupSchema, invitationAcceptSchema, loginSchema, setupAdminSchema } from "@/domain/schemas";
import { USER_ROLES, type UserRole } from "@/domain/types";
import { getServiceContext } from "../current-actor";
import { isDemoMode } from "../env";
import { DEMO_GUEST_COOKIE_VALUE, GUEST_COOKIE_NAME, isGuestModeAvailable } from "../guest";
import { safeNextPath } from "../page-guards";
import { acceptInvitation, canSetupFirstAdmin, setupFirstAdmin } from "../services/account-service";
import { loadActor } from "../services/actor";
import { findDemoAccount, recordDailyLogin, signInWithPassword } from "../services/auth-service";
import type { ServiceContext } from "../services/context";
import { ServiceError } from "../services/errors";
import { endSession, startSession } from "../services/session-service";
import { clearSessionCookie, readSessionCookie, setSessionCookie } from "../session";
import { runAction } from "./action-result";

/** ログインのあとの行き先。戻り先がそのロールで入れる画面なら戻し、入れなければロールのホームへ */
function destinationAfterSignIn(role: UserRole, rawNext: string | undefined): string {
  if (!rawNext) return ROLE_HOME[role];
  const next = safeNextPath(rawNext);
  const allowed = rolesAllowedForPath(next.split("?")[0] ?? next);
  return allowed !== "public" && allowed.includes(role) ? next : ROLE_HOME[role];
}

/** ログインが成立したあとの共通処理（クッキー・見学モードの解除・その日のポイント） */
async function completeSignIn(context: ServiceContext, userId: string, token: string): Promise<UserRole | null> {
  await setSessionCookie(token);
  (await cookies()).delete(GUEST_COOKIE_NAME);
  const actor = await loadActor(context, userId);
  if (!actor) return null;
  await recordDailyLogin(context, actor);
  return actor.role;
}

/** loginId は、まちがえたあとも入力欄に残すために返す（パスワードは返さない） */
export type SignInState = { message: string | null; loginId?: string };

/** メールアドレス（生徒はログインID）とパスワードでログインする */
export async function signInAction(_previous: SignInState, formData: FormData): Promise<SignInState> {
  const rawLoginId = formData.get("loginId");
  const loginId = typeof rawLoginId === "string" ? rawLoginId.slice(0, 254) : "";
  const parsed = loginSchema.safeParse({ loginId: formData.get("loginId"), password: formData.get("password") });
  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "入力をたしかめてください", loginId };
  const context = getServiceContext();
  let destination: string;
  try {
    const signedIn = await signInWithPassword(context, parsed.data);
    const role = await completeSignIn(context, signedIn.userId, signedIn.token);
    if (!role) return { message: "このアカウントではログインできません。運営に知らせてください", loginId };
    const rawNext = formData.get("next");
    destination = destinationAfterSignIn(role, typeof rawNext === "string" ? rawNext : undefined);
  } catch (error) {
    if (error instanceof ServiceError) return { message: error.userMessage, loginId };
    throw error;
  }
  redirect(destination);
}

const demoSignInSchema = z.object({ role: z.enum(USER_ROLES), next: z.string().max(512).optional() });

/** デモモードのワンクリックログイン。本番モードでは何もせずに断る（画面に出していなくても、直接呼ばれうるので） */
export async function demoSignInAction(_previous: SignInState, formData: FormData): Promise<SignInState> {
  if (!isDemoMode()) return { message: "デモログインは使えません" };
  const parsed = demoSignInSchema.safeParse({ role: formData.get("role"), next: formData.get("next") ?? undefined });
  if (!parsed.success) return { message: "ロールをえらびなおしてください" };

  const context = getServiceContext();
  let destination: string;
  try {
    const userId = await findDemoAccount(context, parsed.data.role);
    const { token } = await startSession(context, userId);
    const role = await completeSignIn(context, userId, token);
    if (!role) return { message: "このアカウントではログインできません。データを初期化してから、もう一度ためしてください" };
    destination = destinationAfterSignIn(role, parsed.data.next);
  } catch (error) {
    if (error instanceof ServiceError) return { message: error.userMessage };
    throw error;
  }
  // redirect は例外で動くので try の外で呼ぶ
  redirect(destination);
}

/** 見学モードに入る。デモモードのときだけ。クラス動画の一覧へ */
export async function startGuestViewingAction(): Promise<void> {
  if (!isGuestModeAvailable()) redirect("/login");
  const cookieStore = await cookies();
  cookieStore.set(GUEST_COOKIE_NAME, DEMO_GUEST_COOKIE_VALUE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // 見学は一時的なもの。1日で自動的に終わる
    maxAge: 24 * 60 * 60,
  });
  redirect("/videos");
}

export async function signOutAction(): Promise<void> {
  await endSession(getServiceContext(), await readSessionCookie());
  await clearSessionCookie();
  (await cookies()).delete(GUEST_COOKIE_NAME);
  redirect("/login");
}

/** デモのデータを初期状態に戻す（自動操作を毎回同じ状態から始めるため）。本番では断る */
export async function resetDemoDataAction(): Promise<void> {
  if (!isDemoMode()) return;
  resetDemoData();
  await clearSessionCookie();
  (await cookies()).delete(GUEST_COOKIE_NAME);
  redirect("/login?reset=1");
}

/** 最初の運営アカウントを作る。運営が1人でもいれば断る */
export async function setupFirstAdminAction(values: unknown) {
  return runAction("admin.setup", async () => {
    const context = getServiceContext();
    if (!(await canSetupFirstAdmin(context))) {
      throw new ServiceError("conflict", "運営アカウントはもう作られています。ログイン画面からログインしてください");
    }
    const input = setupAdminSchema.parse(values);
    const created = await setupFirstAdmin(context, { displayName: input.displayName, email: input.email, password: input.password });
    await setSessionCookie(created.token);
    return { destination: ROLE_HOME.admin };
  });
}

/** 招待リンクでパスワードを決める（家族の招待・1人分の招待のどちらも） */
export async function acceptInvitationAction(kind: "family" | "account", values: unknown) {
  return runAction("invitation.accept", async () => {
    const context = getServiceContext();
    const accepted =
      kind === "family"
        ? await (async () => {
            const input = invitationAcceptSchema.parse(values);
            return acceptInvitation(context, { token: input.token, guardianPassword: input.guardianPassword, studentPassword: input.studentPassword });
          })()
        : await (async () => {
            const input = accountSetupSchema.parse(values);
            return acceptInvitation(context, { token: input.token, password: input.password });
          })();
    await setSessionCookie(accepted.token);
    (await cookies()).delete(GUEST_COOKIE_NAME);
    const actor = await loadActor(context, accepted.signedInUserId);
    return { loginIds: accepted.loginIds, homePath: actor ? ROLE_HOME[actor.role] : "/login" };
  });
}
