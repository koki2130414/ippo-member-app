import { describe, expect, it } from "vitest";
import { normalizeDatabaseUrl, toSqlParams } from "./postgres-shared";

describe("接続文字列の正規化", () => {
  it("Supabase の追加引数を取り除き、sslmode から TLS を決める", () => {
    expect(normalizeDatabaseUrl("postgres://u:p@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?sslmode=require&supa=base-pooler.x")).toEqual({
      url: "postgres://u:p@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres",
      ssl: true,
    });
    expect(normalizeDatabaseUrl("postgres://u:p@localhost:5432/db").ssl).toBe(false);
    expect(normalizeDatabaseUrl("postgres://u:p@db.example.com:5432/db").ssl).toBe(true);
  });
});

describe("パラメータ", () => {
  it("配列・オブジェクトは JSON に、undefined は null にする（値を黙って捨てない）", () => {
    expect(toSqlParams(["a", 1, true, null, undefined, ["x"], { a: 1 }])).toEqual(["a", 1, true, null, null, '["x"]', '{"a":1}']);
  });
});
