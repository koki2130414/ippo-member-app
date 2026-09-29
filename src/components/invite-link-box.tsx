"use client";

import { useState } from "react";
import { Button } from "./ui/button";

/**
 * 発行した招待リンクを見せる。リンクはこのときしか表示できない（保存しているのはハッシュだけ）ので、
 * コピーのボタンと、その旨の注意をいっしょに出す。
 */
export function InviteLinkBox({ invitePath, expiresAt, testId }: { invitePath: string; expiresAt: string; testId: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window === "undefined" ? invitePath : `${window.location.origin}${invitePath}`;
  const expires = new Date(expiresAt).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", month: "long", day: "numeric" });

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-primary/40 bg-primary/5 p-3" data-testid={testId}>
      <p className="text-sm font-semibold">ログイン用のリンクを作りました。LINE やメールで本人（保護者）に送ってください。</p>
      <label htmlFor={`${testId}-url`} className="sr-only">ログイン用のリンク</label>
      <input id={`${testId}-url`} readOnly value={url} className="block w-full rounded-md border border-input bg-background px-2 py-2 font-mono text-xs" data-testid={`${testId}-url`} onFocus={(event) => event.currentTarget.select()} />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="outline" onClick={copy} data-testid={`${testId}-copy`}>{copied ? "コピーしました" : "リンクをコピー"}</Button>
        <p className="text-xs text-muted-foreground">{expires}まで有効・1回だけ使えます。この画面を閉じると、同じリンクはもう表示できません（その場合は作り直してください）。</p>
      </div>
    </div>
  );
}
