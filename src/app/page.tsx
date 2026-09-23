import { listPlansForDisplay } from "@/domain/plans";
import { formatLimitForDisplay } from "@/domain/plans";

// Phase 1 時点の LP は「料金表がドメイン層の数値から描けること」を確かめる最小版。
// 世界観・クラス紹介・FAQ・問い合わせは Phase 2 で足す（docs/05）。
export default function LandingPage() {
  const plans = listPlansForDisplay();
  return (
    <main data-page="landing" data-state="ready" className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-sm font-semibold text-primary">IPPO オンラインサッカースクール</p>
      <h1 className="mt-2 text-3xl font-bold">昨日の自分から、一歩前へ</h1>
      <p className="mt-4 text-muted-foreground">
        だれかと比べるのではなく、きのうの自分と比べよう。少しずつ続けることを、いっしょに応援します。
      </p>

      <section aria-labelledby="plans-heading" className="mt-10">
        <h2 id="plans-heading" className="text-xl font-bold">料金プラン</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-sm" data-testid="lp-plan-table">
            <thead>
              <tr className="border-b border-border text-left">
                <th scope="col" className="py-2 pr-2">プラン</th>
                <th scope="col" className="py-2 pr-2 text-right">月額（税込）</th>
                <th scope="col" className="py-2 pr-2 text-right">クラス</th>
                <th scope="col" className="py-2 pr-2 text-right">1on1</th>
                <th scope="col" className="py-2 pr-2 text-right">動画レビュー</th>
                <th scope="col" className="py-2 text-right">ノート</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr key={plan.code} className="border-b border-border" data-plan={plan.code}>
                  <th scope="row" className="py-2 pr-2 text-left font-semibold">{plan.name}</th>
                  <td className="py-2 pr-2 text-right">{plan.monthlyPriceYen.toLocaleString("ja-JP")}円</td>
                  <td className="py-2 pr-2 text-right">{formatLimitForDisplay(plan.limits.classSlots)}</td>
                  <td className="py-2 pr-2 text-right">{formatLimitForDisplay(plan.limits.personalSessions)}</td>
                  <td className="py-2 pr-2 text-right">{formatLimitForDisplay(plan.limits.videoReviews)}</td>
                  <td className="py-2 text-right">{formatLimitForDisplay(plan.limits.notes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          どのプランでも、クラス動画・講義・サッカーIQ診断は見放題です。
        </p>
      </section>
    </main>
  );
}
