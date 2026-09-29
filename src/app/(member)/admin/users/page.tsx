import type { Metadata } from "next";
import Link from "next/link";
import { MemberCreateForm } from "@/components/member-create-form";
import { Pagination } from "@/components/pagination";
import { PlanAssignForm } from "@/components/plan-assign-form";
import { QueryTabs } from "@/components/query-tabs";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { listPlansForDisplay } from "@/domain/plans";
import { listQuerySchema } from "@/domain/schemas";
import { USER_ROLES, type UserRole } from "@/domain/types";
import { getServiceContext } from "@/server/current-actor";
import { loadForPage } from "@/server/page-errors";
import { requirePageActor } from "@/server/page-guards";
import { listMembersForAdmin } from "@/server/services/members-service";

export const metadata: Metadata = { title: "会員の管理" };

const ROLE_LABEL: Record<UserRole, string> = { student: "生徒", guardian: "保護者", coach: "コーチ", admin: "運営" };

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const actor = await requirePageActor(["admin"], "/admin/users");
  const params = await searchParams;
  const query = listQuerySchema.parse(params);
  // tab は "members"（すべて）か、ロール名。知らない値は「すべて」
  const role = USER_ROLES.find((item) => item === query.tab);
  const showForm = params.new === "1";
  const context = getServiceContext();
  const [page, plans] = await Promise.all([loadForPage(() => listMembersForAdmin(context, actor, { role, page: query.page })), context.store.listPlans()]);
  const planOptions = listPlansForDisplay(plans).map((plan) => ({ code: plan.code, name: plan.name }));
  const planName = new Map(planOptions.map((plan) => [plan.code, plan.name]));
  const tabValue = role ?? "members";

  return (
    <main data-page="admin-users" data-state="ready" className="mx-auto max-w-3xl space-y-5 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">会員の管理</h1>
        {showForm ? null : (
          <Link href={`/admin/users?tab=${tabValue}&new=1`} className={buttonVariants()} data-testid="admin-user-add">会員を追加</Link>
        )}
      </div>

      {showForm ? (
        <Card className="space-y-3" data-testid="admin-user-add-panel">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">会員を追加</h2>
            <Link href={`/admin/users?tab=${tabValue}`} className="text-sm text-primary underline" data-testid="admin-user-add-close">とじる</Link>
          </div>
          <MemberCreateForm plans={planOptions} />
        </Card>
      ) : null}

      <QueryTabs
        basePath="/admin/users"
        label="ロールで絞りこむ"
        testIdPrefix="admin-user-role"
        current={tabValue}
        tabs={[{ value: "members", label: "すべて" }, ...USER_ROLES.map((value) => ({ value, label: ROLE_LABEL[value] }))]}
      />

      {page.items.length === 0 ? (
        <p className="text-muted-foreground" data-testid="admin-users-empty">まだ会員がいません。「会員を追加」から登録してください。</p>
      ) : (
        <ul className="space-y-3" data-testid="admin-user-list">
          {page.items.map((row, index) => (
            <li key={row.userId}>
              <Card data-testid="admin-user-row" data-role={row.role} className="space-y-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold">{row.displayName}</p>
                  <p className="text-xs text-muted-foreground">
                    {ROLE_LABEL[row.role]}
                    {row.role === "student" ? `・${row.planCode ? planName.get(row.planCode) : "プラン未加入"}` : ""}
                  </p>
                </div>
                {row.role === "student" ? <PlanAssignForm userId={row.userId} rowIndex={index + 1} currentPlanCode={row.planCode} plans={planOptions} /> : null}
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Pagination basePath="/admin/users" page={page.page} pageSize={page.pageSize} total={page.total} extraQuery={{ tab: tabValue }} />
    </main>
  );
}
