"use client";

import { useState } from "react";
import { deleteKarteEntryAction } from "@/server/actions/karte-actions";

/** 記録を消す。誤操作を防ぐため、1回目で「本当に？」に変わり、2回目で消す（ブラウザのダイアログは使わない） */
export function DeleteEntryButton({ entryId }: { entryId: string }) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    if (!armed) {
      setArmed(true);
      return;
    }
    setBusy(true);
    const result = await deleteKarteEntryAction(entryId);
    setBusy(false);
    if (!result.ok) setError(result.message);
  }

  return (
    <span className="print:hidden">
      <button type="button" onClick={onClick} disabled={busy} onBlur={() => setArmed(false)} className="text-xs font-semibold text-muted-foreground underline hover:text-destructive" data-testid="karte-entry-delete">
        {armed ? "本当に消す" : "消す"}
      </button>
      {error ? <span role="alert" className="ml-1 text-xs text-destructive">{error}</span> : null}
    </span>
  );
}
