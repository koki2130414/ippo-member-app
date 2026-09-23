import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [".next/**", "node_modules/**", "playwright-report/**", "test-results/**", "next-env.d.ts"],
  },
  {
    rules: {
      // 仕様 3章: any 禁止・as による握りつぶし禁止。`as const` はこのルールでも許可される。
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-assertions": ["error", { assertionStyle: "never" }],
      "@typescript-eslint/no-non-null-assertion": "error",
      // 仕様 10.2: ネイティブダイアログはブラウザ自動操作を止めるので使わせない
      "no-alert": "error",
      "no-restricted-globals": [
        "error",
        { name: "alert", message: "Radix AlertDialog を使ってください（docs/06）" },
        { name: "confirm", message: "Radix AlertDialog を使ってください（docs/06）" },
        { name: "prompt", message: "フォームで入力を受けてください（docs/06）" },
      ],
      // 仕様 5章: ログへ機密を出さないため、console は warn/error だけに絞り、必ず logger 経由にする
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
  },
  {
    // 仕様 4.1: domain は純粋関数と型だけ。フレームワークや DB に依存させない
    files: ["src/domain/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["react", "react-*", "next", "next/*"], message: "src/domain は React/Next に依存させない" },
            { group: ["@supabase/*"], message: "src/domain は Supabase に依存させない" },
            { group: ["@/data/*", "@/server/*", "@/app/*", "@/components/*"], message: "src/domain は下位層だけを import する" },
          ],
        },
      ],
    },
  },
  {
    // 表示コンポーネントからサーバー専用の層を直接触らせない
    files: ["src/components/**/*.tsx", "src/components/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [{ group: ["@/data/*", "@/server/services/*"], message: "components は表示のみ。データ取得は app 側で行う" }] },
      ],
    },
  },
];

export default config;
