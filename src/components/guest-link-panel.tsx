"use client";

import { useState } from "react";
import { issueGuestLinkAction, revokeGuestLinkAction } from "@/server/actions/admin-actions";
import { StatusMessage } from "./status-message";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogTrigger } from "./ui/alert-dialog";
import { Button } from "./ui/button";

function formatJst(iso: string): string {
  return new Date(iso).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

/**
 * 見学リンクの発行と停止（運営のホーム）。
 * リンクは作ったときにしか表示できない（保存しているのはハッシュだけ）。なくしたら作り直す。
 */
export function GuestLinkPanel({ active, createdAt }: { active: boolean; createdAt: string | null }) {
  const [busy, setBusy] = useState(false);
  const [issued, setIssued] = useState<{ guestPath: string; createdAt: string } | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const isActive = issued !== null || active;
  const since = issued?.createdAt ?? createdAt;
  const url = issued ? (typeof window === "undefined" ? issued.guestPath : `${window.location.origin}${issued.guestPath}`) : null;

  async function issue() {
    setBusy(true);
    setMessage(null);
    setCopied(false);
    const result = await issueGuestLinkAction();
    setBusy(false);
    if (!result.ok) return setMessage({ tone: "error", text: result.message });
    setIssued(result.data);
  }

  async function revoke() {
    setBusy(true);
    setMessage(null);
    const result = await revokeGuestLinkAction();
    setBusy(false);
    if (!result.ok) return setMessage({ tone: "error", text: result.message });
    setIssued(null);
    setMessage({ tone: "success", text: "見学リンクを止めました。いま見学中の人も入れなくなります" });
  }

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section aria-labelledby="guest-link-heading" className="space-y-3 rounded-lg border border-border p-4" data-testid="guest-link-panel" data-state={isActive ? "active" : "none"}>
      <div>
        <h2 id="guest-link-heading" className="font-semibold">見学リンク</h2>
        <p className="text-sm text-muted-foreground">
          このリンクを知っている人は、ログインなしで会員画面（ホーム・クラス動画・講義）を見られます。記録やポイントはつきません。
          クラス動画には子どもが映っているので、渡す相手に気をつけてください。
        </p>
      </div>

      <p className="text-sm" data-testid="guest-link-status">
        {isActive && since ? `いまのリンク: 有効（${formatJst(since)}に作成）` : "いまのリンク: ありません"}
      </p>

      {url ? (
        <div className="space-y-2 rounded-lg border border-primary/40 bg-primary/5 p-3">
          <label htmlFor="guest-link-url" className="text-sm font-semibold">見学リンク</label>
          <input id="guest-link-url" readOnly value={url} className="block w-full rounded-md border border-input bg-background px-2 py-2 font-mono text-xs" data-testid="guest-link-url" onFocus={(event) => event.currentTarget.select()} />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="outline" onClick={copy} data-testid="guest-link-copy">{copied ? "コピーしました" : "リンクをコピー"}</Button>
            <p className="text-xs text-muted-foreground">この画面を閉じると、同じリンクはもう表示できません（そのときは作り直してください）。</p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={issue} disabled={busy} data-busy={busy ? "true" : undefined} data-testid="guest-link-issue">
          {isActive ? "リンクを作り直す（前のリンクは使えなくなります）" : "見学リンクを作る"}
        </Button>
        {isActive ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" size="sm" variant="outline" disabled={busy} data-testid="guest-link-revoke">リンクを止める</Button>
            </AlertDialogTrigger>
            <AlertDialogContent data-testid="guest-link-revoke-dialog">
              <AlertDialogTitle>見学リンクを止めますか？</AlertDialogTitle>
              <AlertDialogDescription>止めると、リンクを知っている人も、いま見学中の人も入れなくなります。あとで新しいリンクを作ることはできます。</AlertDialogDescription>
              <div className="flex justify-end gap-2">
                <AlertDialogCancel asChild>
                  <Button type="button" variant="ghost">もどる</Button>
                </AlertDialogCancel>
                <AlertDialogAction asChild>
                  <Button type="button" variant="destructive" onClick={revoke} data-testid="guest-link-revoke-confirm">リンクを止める</Button>
                </AlertDialogAction>
              </div>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
      </div>
      {message ? <StatusMessage tone={message.tone} testId="guest-link-result">{message.text}</StatusMessage> : null}
    </section>
  );
}
