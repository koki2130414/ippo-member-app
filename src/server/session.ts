import "server-only";
import { cookies } from "next/headers";
import { SESSION_TTL_SECONDS } from "./services/session-service";

/**
 * セッションのクッキー。中身はランダムなトークンだけで、ログイン中かどうかはデータベースで確かめる
 * （services/session-service.ts）。署名用の鍵は使わない。
 */
export const SESSION_COOKIE_NAME = "ippo_session";

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    // 本番は https だけで送る
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function readSessionCookie(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE_NAME)?.value;
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE_NAME);
}
