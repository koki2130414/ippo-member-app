import { BrandLogo } from "@/components/brand-logo";
import type { Metadata } from "next";
import { InvitationPanel, type InvitationPanelLookup } from "@/components/invitation-form";
import { getServiceContext } from "@/server/current-actor";
import { previewInvitation } from "@/server/services/account-service";

export const metadata: Metadata = { title: "パスワードを決める", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await previewInvitation(getServiceContext(), token);
  const lookup: InvitationPanelLookup = result.ok
    ? { ok: true, purpose: result.preview.purpose, guardianLabel: result.preview.guardianLabel, studentDisplayName: result.preview.studentDisplayName, accountDisplayName: result.preview.accountDisplayName }
    : { ok: false, message: result.message };

  return (
    <main data-page="invite" data-state="ready" className="mx-auto max-w-md space-y-6 px-4 py-10">
      <div>
        <BrandLogo className="h-10" priority />
        <h1 className="mt-2 text-2xl font-bold">パスワードを決める</h1>
      </div>
      <InvitationPanel token={token} lookup={lookup} />
    </main>
  );
}
