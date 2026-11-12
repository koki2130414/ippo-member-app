"use client";

import { Button } from "../ui/button";

export function PrintButton() {
  return (
    <Button type="button" variant="secondary" onClick={() => window.print()} className="print:hidden" data-testid="karte-print">
      印刷する
    </Button>
  );
}
