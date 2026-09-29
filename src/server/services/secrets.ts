import { createHash, randomBytes, randomInt, scrypt, timingSafeEqual } from "node:crypto";

/**
 * パスワードとトークンの扱い。どれも「そのものは保存しない」ための道具。
 * - パスワード: scrypt（ソルトつき）でハッシュにして保存する
 * - セッション・招待のトークン: ランダムな値を利用者に渡し、DB には SHA-256 のハッシュだけを置く
 *   （DB の中身が漏れても、そこからログインや招待の受け取りはできない）
 */

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;

function scryptAsync(password: string, salt: Buffer, n: number, r: number, p: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, { N: n, r, p, maxmem: 64 * 1024 * 1024 }, (error, derived) => (error ? reject(error) : resolve(derived)));
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scryptAsync(password, salt, SCRYPT_N, SCRYPT_R, SCRYPT_P);
  // パラメータも一緒に保存しておき、将来強くしても古いハッシュを検証できるようにする
  return ["scrypt", SCRYPT_N, SCRYPT_R, SCRYPT_P, salt.toString("base64url"), derived.toString("base64url")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, n, r, p, saltText, hashText] = stored.split("$");
  if (scheme !== "scrypt" || !n || !r || !p || !saltText || !hashText) return false;
  const expected = Buffer.from(hashText, "base64url");
  const derived = await scryptAsync(password, Buffer.from(saltText, "base64url"), Number(n), Number(r), Number(p));
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

/** ログインIDが無いときも同じくらい時間をかけ、「そのIDは存在しない」ことを応答時間から推測されにくくする */
const DUMMY_HASH = "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA$" + "A".repeat(86);
export async function burnPasswordCheck(password: string): Promise<void> {
  await verifyPassword(password, DUMMY_HASH);
}

export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function randomSixDigits(): number {
  return randomInt(0, 1_000_000);
}
