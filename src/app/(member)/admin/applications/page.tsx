import type { Metadata } from "next";
import { ApplicationReview } from "@/components/application-review";
import { Pagination } from "@/components/pagination";
import { QueryTabs } from "@/components/query-tabs";
import { Card } from "@/components/ui/card";
import { listPlansForDisplay } from "@/domain/plans";
import { GRADE_LABELS } from "@/domain/registration";
import { listQuerySchema } from "@/domain/schemas";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/domain/types";
import { getServiceContext } from "@/server/current-actor";
import { loadForPage } from "@/server/page-errors";
import { requirePageActor } from "@/server/page-guards";
import { listApplicationsForAdmin } from "@/server/services/registration-service";

export const metadata: Metadata = { title: "入会の申し込み" };

const STATUS_LABEL: Record<ApplicationStatus, string> = { pending: "審査待ち", approved: "承認ずみ", rejected: "見送り" };

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default async function AdminApplicationsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const actor = await requirePageActor(["admin"], "/admin/applications");
  const query = listQuerySchema.parse(await searchParams);
  const status = APPLICATION_STATUSES.find((item) => item === query.tab) ?? "pending";
  const context = getServiceContext();
  const [page, plans] = await Promise.all([loadForPage(() => listApplicationsForAdmin(context, actor, { status, page: query.page })), context.store.listPlans()]);
  const planOptions = listPlansForDisplay(plans).map((plan) => ({ code: plan.code, name: plan.name }));

  return (
    <main data-page="admin-applications" data-state="ready" className="mx-auto max-w-3xl space-y-5 px-4 py-6">
      <h1 className="text-2xl font-bold">入会の申し込み</h1>
      <QueryTabs basePath="/admin/applications" label="審査の状態" testIdPrefix="admin-application-status" current={status} tabs={APPLICATION_STATUSES.map((value) => ({ value, label: STATUS_LABEL[value] }))} />

      {page.items.length === 0 ? (
        <p className="text-muted-foreground" data-testid="admin-applications-empty">{STATUS_LABEL[status]}の申し込みはありません。</p>
      ) : (
        <ul className="space-y-3" data-testid="admin-application-list">
          {page.items.map((application, index) => (
            <li key={application.id}>
              <Card data-testid="admin-application-row" className="space-y-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold">{application.childDisplayName}</p>
                  <p className="text-xs text-muted-foreground">申し込み {formatDate(application.createdAt)}</p>
                </div>
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                  {application.childFullName ? (<><dt className="text-muted-foreground">お名前</dt><dd>{application.childFullName}</dd></>) : null}
                  <dt className="text-muted-foreground">学年</dt><dd>{GRADE_LABELS[application.grade]}</dd>
                  <dt className="text-muted-foreground">出身地</dt><dd>{application.prefecture}</dd>
                  <dt className="text-muted-foreground">保護者のメール</dt><dd className="break-all">{application.guardianEmail}</dd>
                  {application.reviewNote ? (<><dt className="text-muted-foreground">メモ</dt><dd>{application.reviewNote}</dd></>) : null}
                </dl>
                {status === "pending" ? <ApplicationReview applicationId={application.id} rowIndex={index + 1} childDisplayName={application.childDisplayName} plans={planOptions} /> : null}
              </Card>
            </li>
          ))}
        </ul>
      )}
      <Pagination basePath="/admin/applications" page={page.page} pageSize={page.pageSize} total={page.total} extraQuery={{ tab: status }} />
    </main>
  );
}
