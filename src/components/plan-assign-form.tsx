"use client";

import { useState } from "react";
import { assignPlanAction } from "@/server/actions/admin-actions";
import { StatusMessage } from "./status-message";
import { Button } from "./ui/button";

/**
 * 一覧の行ごとのプラン変更。select の id は行番号でつける（会員IDや名前を DOM の識別子に入れない。仕様 10.8）。
 */
export function PlanAssignForm({ userId, rowIndex, currentPlanCode, plans }: { userId: string; rowIndex: number; currentPlanCode: string | null; plans: { code: string; name: string }[] }) {
  const [planCode, setPlanCode] = useState(currentPlanCode ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const selectId = `plan-code-${rowIndex}`;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const result = await assignPlanAction(userId, planCode);
    setBusy(false);
    setMessage(result.ok ? { tone: "success", text: "プランを変更しました" } : { tone: "error", text: result.message });
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
      <div>
        <label htmlFor={selectId} className="sr-only">プラン</label>
        <select id={selectId} value={planCode} onChange={(event) => setPlanCode(event.target.value)} className="h-9 rounded-lg border border-input bg-background px-2 text-sm" data-testid="admin-user-plan-select">
          <option value="">なし（未加入）</option>
          {plans.map((plan) => (
            <option key={plan.code} value={plan.code}>{plan.name}</option>
          ))}
        </select>
      </div>
      <Button type="submit" size="sm" variant="outline" disabled={busy || planCode === (currentPlanCode ?? "")} data-busy={busy ? "true" : undefined} data-testid="admin-user-plan-submit">
        プランを変える
      </Button>
      {message ? <div className="w-full"><StatusMessage tone={message.tone} testId="admin-user-plan-result">{message.text}</StatusMessage></div> : null}
    </form>
  );
}
