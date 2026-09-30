/**
 * YouTube 配信の動画の注意。管理画面の入力欄で、運営が登録するときに出す。
 * 会員の再生画面・一覧には出さない（運営の判断: 2026-10-01）。
 */
export function OutsideAppWarning({ testId }: { testId: string }) {
  return (
    <p role="note" data-testid={testId} className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
      この動画は YouTube で公開しているため、アプリの外でも見られます。
    </p>
  );
}
