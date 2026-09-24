import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { isDemoMode } from "./env";

/**
 * セッショントークン（署名つき）。デモモード用。本番は Supabase Auth に置き換える（Phase 6）。
 *
 * クッキーに入れるのは userId と有効期限だけ。ロールや担当範囲は入れない（毎回 DB から読む。services/actor.ts）。
 * 署名で守っているのは「他人の userId に書き換えられないこと」。
 */

export const SESSION_COOKIE_NAME = "ippo_session";
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

declare global {
  var __ippoEphemeralSessionSecret: string | undefined;
}

/**
 * 署名の鍵。IPPO_SESSION_SECRET があればそれを使う。
 * 無いときは、デモモードに限ってサーバーの起動ごとにランダムに作る（コードに鍵を書かないため）。
 * その場合、再起動やインスタンスが変わるとログインし直しになる（README に明記）。
 */
function sessionSecret(): string {
  const configured = process.env.IPPO_SESSION_SECRET;
  if (configured && configured.length >= 32) return configured;
  if (!isDemoMode()) {
    // 本番で鍵が無い・短いまま動かすと、推測されやすい署名になる。黙って動かさずに止める
    throw new Error("IPPO_SESSION_SECRET（32文字以上）を設定してください");
  }
  globalThis.__ippoEphemeralSessionSecret ??= randomBytes(32).toString("hex");
  return globalThis.__ippoEphemeralSessionSecret;
}

function sign(payload: string): string {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

export function createSessionToken(userId: string, now: Date): string {
  const payload = Buffer.from(JSON.stringify({ uid: userId, exp: Math.floor(now.getTime() / 1000) + SESSION_MAX_AGE_SECONDS })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

/** 署名と期限を確かめて userId を返す。少しでもおかしければ null（理由は区別しない） */
export function verifySessionToken(token: string | undefined, now: Date): string | null {
  if (!token) return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined) return null;
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  // 長さが違うと timingSafeEqual が例外を投げるので先に比べる。比較そのものは時間差の出ない方法で行う
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof parsed !== "object" || parsed === null) return null;
    const uid = "uid" in parsed ? parsed.uid : undefined;
    const exp = "exp" in parsed ? parsed.exp : undefined;
    if (typeof uid !== "string" || typeof exp !== "number") return null;
    if (exp * 1000 <= now.getTime()) return null;
    return uid;
  } catch {
    return null;
  }
}
