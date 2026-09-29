import type { UserId } from "@/domain/types";
import type { ServiceContext } from "./context";
import { generateToken, hashToken } from "./secrets";

/**
 * ログイン中のセッション（データベースに保存する方式）。
 * クッキーにはランダムなトークンだけを入れ、DB にはそのハッシュを置く。署名用の鍵が要らないので、
 * 鍵を環境変数に設定し忘れて全員ログインできない、ということが起きない。
 */

export const SESSION_TTL_SECONDS = 14 * 24 * 60 * 60;

export async function startSession(context: ServiceContext, userId: UserId): Promise<{ token: string; expiresAt: Date }> {
  const token = generateToken();
  const now = context.now();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);
  await context.store.createSession({ tokenHash: hashToken(token), userId, createdAt: now.toISOString(), expiresAt: expiresAt.toISOString() });
  return { token, expiresAt };
}

export async function resolveSession(context: ServiceContext, token: string | undefined): Promise<UserId | null> {
  if (!token || token.length > 200) return null;
  const session = await context.store.findSession(hashToken(token), context.now());
  return session?.userId ?? null;
}

export async function endSession(context: ServiceContext, token: string | undefined): Promise<void> {
  if (!token || token.length > 200) return;
  await context.store.deleteSession(hashToken(token));
}
