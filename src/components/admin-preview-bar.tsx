import Link from "next/link";

/**
 * 運営が会員画面を開いているときの案内。
 * 見え方は会員と同じにして、「運営として見ている」「記録はつかない」ことだけを上に出す。
 */
export function AdminPreviewBar() {
  const links = [
    { href: "/home", label: "ホーム", testId: "admin-preview-home" },
    { href: "/videos", label: "クラス動画", testId: "admin-preview-videos" },
    { href: "/lectures", label: "講義", testId: "admin-preview-lectures" },
  ];
  return (
    <div className="rounded-lg border border-primary/40 bg-primary/5 px-4 py-3 text-sm" data-testid="admin-preview-bar">
      <p className="font-semibold">運営として会員画面を見ています</p>
      <p className="text-muted-foreground">すべてのプランの中身が見られます。「見おわった」やポイント、クイズの記録はつきません。</p>
      <ul className="mt-2 flex flex-wrap gap-3 font-semibold">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="text-primary underline" data-testid={link.testId}>{link.label}</Link>
          </li>
        ))}
        <li>
          <Link href="/admin" className="text-primary underline" data-testid="admin-preview-back">運営のホームへもどる</Link>
        </li>
      </ul>
    </div>
  );
}
