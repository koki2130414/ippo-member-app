import type { NextConfig } from "next";

// セキュリティヘッダーは「全ページ共通の最低ライン」として設定する。
// CSP は動画プレイヤー（Mux / YouTube）の導入時に配信元が確定してから締める（docs/03 参照）。
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // 会員ページを他サイトの iframe に埋め込ませない（クリックジャッキング対策）
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // フレームワーク名を名乗る意味がないので消す
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
