import { afterEach, describe, expect, it } from "vitest";
import { createSessionToken, verifySessionToken } from "./session";

const now = new Date("2026-09-24T00:00:00.000Z");

describe("セッショントークン", () => {
  afterEach(() => {
    delete process.env.IPPO_SESSION_SECRET;
  });

  it("作ったトークンは検証でき、userId が戻る", () => {
    expect(verifySessionToken(createSessionToken("u-student-0001", now), now)).toBe("u-student-0001");
  });

  it("userId を書き換えたら無効", () => {
    const [, signature] = createSessionToken("u-student-0001", now).split(".");
    const forged = Buffer.from(JSON.stringify({ uid: "u-admin-0001", exp: 9_999_999_999 })).toString("base64url");
    expect(verifySessionToken(`${forged}.${signature}`, now)).toBeNull();
  });

  it("期限切れ・壊れた形は無効", () => {
    const token = createSessionToken("u1", now);
    expect(verifySessionToken(token, new Date("2026-10-02T00:00:00.000Z"))).toBeNull();
    for (const broken of [undefined, "", "abc", "a.b.c", `${token}x`]) expect(verifySessionToken(broken, now)).toBeNull();
  });

  it("鍵が変わると、前のトークンは使えない", () => {
    process.env.IPPO_SESSION_SECRET = "a".repeat(32);
    const token = createSessionToken("u1", now);
    process.env.IPPO_SESSION_SECRET = "b".repeat(32);
    expect(verifySessionToken(token, now)).toBeNull();
  });
});
