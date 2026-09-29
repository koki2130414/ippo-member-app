"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { approveApplicationAction, rejectApplicationAction } from "@/server/actions/admin-actions";
import { InviteLinkBox } from "./invite-link-box";
import { StatusMessage } from "./status-message";
import { Button } from "./ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogTrigger } from "./ui/alert-dialog";

/** 1件の申し込みの承認・見送り。select や入力の id は行番号でつける（会員の情報を識別子に入れない） */
export function ApplicationReview({ applicationId, rowIndex, childDisplayName, plans }: { applicationId: string; rowIndex: number; childDisplayName: string; plans: { code: string; name: string }[] }) {
  const router = useRouter();
  const [planCode, setPlanCode] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<{ invitePath: string; expiresAt: string; reusedGuardian: boolean } | null>(null);
  const [rejected, setRejected] = useState(false);

  async function approve() {
    setBusy(true);
    setError(null);
    const result = await approveApplicationAction(applicationId, planCode);
    setBusy(false);
    if (!result.ok) return setError(result.message);
    setInvite(result.data);
  }

  async function reject() {
    setBusy(true);
    setError(null);
    const result = await rejectApplicationAction(applicationId, note);
    setBusy(false);
    if (!result.ok) return setError(result.message);
    setRejected(true);
    router.refresh();
  }

  if (invite) {
    return (
      <div className="space-y-2">
        <StatusMessage tone="success" testId="admin-application-result">承認しました</StatusMessage>
        {invite.reusedGuardian ? <p className="text-xs text-muted-foreground">保護者はすでに会員です。リンクでは{childDisplayName}さんのパスワードだけを決めてもらいます。</p> : null}
        <InviteLinkBox invitePath={invite.invitePath} expiresAt={invite.expiresAt} testId="admin-application-invite" />
      </div>
    );
  }
  if (rejected) return <StatusMessage tone="info" testId="admin-application-result">見送りにしました</StatusMessage>;

  const planSelectId = `application-plan-${rowIndex}`;
  const noteId = `application-note-${rowIndex}`;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label htmlFor={planSelectId} className="text-xs font-semibold">プラン</label>
          <select id={planSelectId} value={planCode} onChange={(event) => setPlanCode(event.target.value)} className="mt-1 block h-9 rounded-lg border border-input bg-background px-2 text-sm" data-testid="admin-application-plan">
            <option value="">あとで決める（未加入）</option>
            {plans.map((plan) => <option key={plan.code} value={plan.code}>{plan.name}</option>)}
          </select>
        </div>
        <Button type="button" onClick={approve} disabled={busy} data-busy={busy ? "true" : undefined} data-testid="admin-application-approve">承認してリンクを作る</Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="outline" disabled={busy} data-testid="admin-application-reject">見送る</Button>
          </AlertDialogTrigger>
          <AlertDialogContent data-testid="admin-application-reject-dialog">
            <AlertDialogTitle>{childDisplayName}さんの申し込みを見送りますか？</AlertDialogTitle>
            <AlertDialogDescription>見送ると、お子さまのお名前は消えます。保護者への連絡は、メールで別に行ってください。</AlertDialogDescription>
            <div>
              <label htmlFor={noteId} className="text-sm font-semibold">運営用のメモ（任意・申込者には見えません）</label>
              <textarea id={noteId} value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} rows={3} className="mt-1 block w-full rounded-lg border border-input bg-background p-2 text-sm" />
            </div>
            <div className="flex justify-end gap-2">
              <AlertDialogCancel asChild>
                <Button type="button" variant="ghost">もどる</Button>
              </AlertDialogCancel>
              <AlertDialogAction asChild>
                <Button type="button" variant="destructive" onClick={reject} data-testid="admin-application-reject-confirm">この申し込みを見送る</Button>
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      {error ? <StatusMessage tone="error" testId="admin-application-error">{error}</StatusMessage> : null}
    </div>
  );
}
