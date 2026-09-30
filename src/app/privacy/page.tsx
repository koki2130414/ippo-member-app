import { BrandLogo } from "@/components/brand-logo";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "個人情報の取り扱い" };

/**
 * 申し込みフォームの同意に使う説明。正式なプライバシーポリシーは法務の確認後に差し替える（README の法務チェックリスト）。
 * 確認前であることを、画面でもはっきり書く（適合を断定しない）。
 */
export default function PrivacyPage() {
  return (
    <main data-page="privacy" data-state="ready" className="mx-auto max-w-2xl space-y-5 px-4 py-10 text-sm leading-relaxed">
      <BrandLogo className="h-10" />
      <h1 className="text-2xl font-bold">個人情報の取り扱い（準備中の版）</h1>
      <p className="rounded-lg border border-border bg-muted px-3 py-2">この文面は正式公開前のもので、専門家の確認を受けて改める予定です。</p>

      <section className="space-y-2">
        <h2 className="text-lg font-bold">お預かりする情報</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>お子さまのお名前（運営だけが見ます）</li>
          <li>アプリで表示する名前（ニックネーム。ほかの会員やコーチに見えます）</li>
          <li>学年、出身地（都道府県）</li>
          <li>保護者のメールアドレス（連絡と、保護者のログインに使います）</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold">使いみち</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>入会の審査と、ご連絡</li>
          <li>アプリのログインと、学年に合わせた表示</li>
          <li>クラスの運営（地域ごとの人数の把握など）</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold">守っていること</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>本名はほかの会員に表示しません</li>
          <li>パスワードはそのまま保存せず、元に戻せない形（ハッシュ）で保存します</li>
          <li>申し込みを見送った場合、お子さまのお名前は消します</li>
          <li>退会すると、お名前・メールアドレス・学年・出身地を消します</li>
        </ul>
      </section>

      <p>ご質問は運営までお問い合わせください。</p>
    </main>
  );
}
