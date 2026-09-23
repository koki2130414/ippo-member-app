import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "IPPO", template: "%s | IPPO" },
  description: "昨日の自分から、一歩前へ。小学生・中学生のためのオンラインサッカースクール。",
  // 会員アプリなので検索エンジンには LP 以外を出さない。LP 側で個別に index を許可する
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-dvh font-sans antialiased">{children}</body>
    </html>
  );
}
