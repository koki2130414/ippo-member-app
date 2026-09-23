import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./test/server-only-stub.ts", import.meta.url)),
    },
  },
  test: {
    // domain と services のテストは DB もブラウザも使わない（仕様 4.1）
    environment: "node",
    include: ["src/**/*.test.ts"],
    // 日付テストが実行環境のタイムゾーンに左右されないよう、あえて UTC 以外に固定して JST 変換の抜けを炙り出す
    env: { TZ: "America/Los_Angeles" },
  },
});
