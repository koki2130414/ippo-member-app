/**
 * YouTube 配信の動画に必ず出す注意（仕様 9章）。
 * 守れない約束を UI で装わないため、生徒側の再生画面と管理画面の入力欄の両方で同じ文言を使う。
 */
export function OutsideAppWarning({ testId }: { testId: string }) {
  return (
    <p role="note" data-testid={testId} className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
      この動画は YouTube で公開しているため、アプリの外でも見られます。
    </p>
  );
}
