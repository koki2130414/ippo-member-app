"use client";

import { useState } from "react";
import { issueAccountInvitationAction } from "@/server/actions/admin-actions";
import { InviteLinkBox } from "./invite-link-box";
import { StatusMessage } from "./status-message";
import { Button } from "./ui/button";

/** 会員一覧の行ごとの「ログイン用リンク」。パスワードを忘れたときの再設定にも使う */
export function IssueLoginLink({ userId, hasLogin }: { userId: string; hasLogin: boolean }) {
  const [busy, setBusy] = useState(false);
  const [issued, setIssued] = useState<{ invitePath: string; expiresAt: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function issue() {
    setBusy(true);
    setError(null);
    const result = await issueAccountInvitationAction(userId);
    setBusy(false);
    if (!result.ok) return setError(result.message);
    setIssued(result.data);
  }

  if (issued) return <InviteLinkBox invitePath={issued.invitePath} expiresAt={issued.expiresAt} testId="admin-user-login-link" />;
  return (
    <div className="space-y-2">
      <Button type="button" size="sm" variant="outline" onClick={issue} disabled={busy} data-busy={busy ? "true" : undefined} data-testid="admin-user-issue-login">
        {hasLogin ? "パスワード再設定のリンクを作る" : "ログイン用のリンクを作る"}
      </Button>
      {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}
    </div>
  );
}
