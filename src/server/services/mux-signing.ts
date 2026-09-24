import { createSign } from "node:crypto";

/**
 * Mux Signed Playback のトークン（RS256 の JWT）。
 * 鍵はサーバーの環境変数だけにあり、トークンは再生ボタンの POST のレスポンスでだけ返す。
 * 期限を短くしておけば、トークンが漏れても長くは使えない。
 */

export const MUX_TOKEN_TTL_SECONDS = 10 * 60;

export interface MuxSigningKey {
  keyId: string;
  /** Mux の管理画面が出す base64 エンコード済みの PEM */
  privateKeyBase64: string;
}

export function readMuxSigningKey(): MuxSigningKey | null {
  const keyId = process.env.MUX_SIGNING_KEY_ID;
  const privateKeyBase64 = process.env.MUX_SIGNING_PRIVATE_KEY;
  return keyId && privateKeyBase64 ? { keyId, privateKeyBase64 } : null;
}

function base64url(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

export function signMuxPlaybackToken(playbackId: string, key: MuxSigningKey, now: Date): { token: string; expiresAt: Date } {
  const expiresAt = new Date(now.getTime() + MUX_TOKEN_TTL_SECONDS * 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT", kid: key.keyId }));
  // aud "v" = 動画再生。sub が playbackId
  const payload = base64url(JSON.stringify({ sub: playbackId, aud: "v", exp: Math.floor(expiresAt.getTime() / 1000), kid: key.keyId }));
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${payload}`);
  const signature = signer.sign(Buffer.from(key.privateKeyBase64, "base64").toString("utf8")).toString("base64url");
  return { token: `${header}.${payload}.${signature}`, expiresAt };
}
