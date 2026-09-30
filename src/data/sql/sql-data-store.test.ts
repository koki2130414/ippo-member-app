import { PGlite } from "@electric-sql/pglite";
import { beforeEach, describe, expect, it } from "vitest";
import { acceptInvitation, issueAccountInvitation, setupFirstAdmin } from "@/server/services/account-service";
import { loadActor } from "@/server/services/actor";
import { signInWithPassword } from "@/server/services/auth-service";
import type { ServiceContext } from "@/server/services/context";
import { deleteMember } from "@/server/services/members-service";
import { awardForOwnAction, getPointSummary } from "@/server/services/points-service";
import { approveApplication, rejectApplication, submitApplication } from "@/server/services/registration-service";
import { resolveSession } from "@/server/services/session-service";
import { listVideosForMember, startPlayback } from "@/server/services/video-service";
import { loadMigrations } from "./migrations";
import { runMigrations, seedBaseContent } from "./setup";
import { pgliteClient, type SqlClient } from "./sql-client";
import { SqlDataStore } from "./sql-data-store";

/**
 * 本番（Supabase の Postgres）と同じ SQL を、メモリ上の Postgres（PGlite）で動かして確かめる。
 * mock で確かめているサービスの流れを、SQL の実装でももう一度通す（2つの実装の振る舞いをそろえるため）。
 */

let client: SqlClient;
let context: ServiceContext;
let clock: Date;

beforeEach(async () => {
  client = pgliteClient(new PGlite());
  await runMigrations(client, loadMigrations());
  await seedBaseContent(client);
  clock = new Date("2026-09-29T03:00:00.000Z");
  let sequence = 0;
  context = {
    store: new SqlDataStore(client),
    now: () => new Date(clock),
    newId: () => `sql-id-${String(++sequence).padStart(4, "0")}`,
    media: { storageAvailable: false, muxSigningKey: null },
  };
});

async function createAdmin() {
  const created = await setupFirstAdmin(context, { displayName: "運営", email: "owner@example.invalid", password: "owner-pass-1" });
  const admin = await loadActor(context, created.userId);
  if (!admin) throw new Error("admin");
  return admin;
}

const application = {
  guardianEmail: "parent@example.invalid",
  childFullName: "架空 たろう",
  childDisplayName: "タロウ",
  grade: "e5" as const,
  prefecture: "栃木県" as const,
  consent: true as const,
};

describe("データベースの準備", () => {
  it("マイグレーションと初期の中身は、何度流しても同じ（2回目は何もしない）", async () => {
    expect(await runMigrations(client, loadMigrations())).toEqual([]);
    await seedBaseContent(client);
    const [videos] = await client.query<{ count: number }>("select count(*)::int as count from videos");
    const [plans] = await client.query<{ count: number }>("select count(*)::int as count from plans");
    expect(videos?.count).toBe(42);
    expect(plans?.count).toBe(5);
  });

  it("すべてのテーブルで RLS が有効（アプリのサーバー以外からは読めない）", async () => {
    const tables = await client.query<{ relname: string; relrowsecurity: boolean }>(
      "select c.relname, c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace where c.relkind = 'r' and n.nspname = current_schema()",
    );
    expect(tables.length).toBeGreaterThan(20);
    expect(tables.filter((table) => !table.relrowsecurity).map((table) => table.relname)).toEqual([]);
  });

  it("人は1人も入っていない（最初の運営は /setup で作る）", async () => {
    const [members] = await client.query<{ count: number }>("select count(*)::int as count from members");
    expect(members?.count).toBe(0);
  });
});

describe("ログイン（SQL 版）", () => {
  it("最初の運営を作り、メールとパスワードでログインできる。2人目は /setup では作れない", async () => {
    const admin = await createAdmin();
    expect(admin.role).toBe("admin");
    const signedIn = await signInWithPassword(context, { loginId: "owner@example.invalid", password: "owner-pass-1" });
    expect(await resolveSession(context, signedIn.token)).toBe(admin.userId);
    await expect(setupFirstAdmin(context, { displayName: "x", email: "x@example.invalid", password: "xxxx-xxxx-1" })).rejects.toMatchObject({ code: "conflict" });
    await expect(signInWithPassword(context, { loginId: "owner@example.invalid", password: "wrong-pass-1" })).rejects.toMatchObject({ code: "unauthenticated" });
  });

  it("申し込み → 承認 → 招待リンク → 生徒がログインIDでログイン → 動画が見られる", async () => {
    const admin = await createAdmin();
    const { applicationId } = await submitApplication(context, application);
    const approved = await approveApplication(context, admin, { applicationId, planCode: "light" });
    const accepted = await acceptInvitation(context, { token: approved.invitation.token, guardianPassword: "guardian-pass-1", studentPassword: "student-pass-1" });
    const studentLoginId = accepted.loginIds[1]?.loginId ?? "";
    expect(studentLoginId).toMatch(/^ippo-\d{6}$/);

    const student = await signInWithPassword(context, { loginId: studentLoginId, password: "student-pass-1" });
    const studentActor = await loadActor(context, student.userId);
    const list = await listVideosForMember(context, studentActor, { category: undefined, page: 1 });
    expect(list.access.status).toBe("available");
    expect(list.page.total).toBe(42);
    expect(list.page.items[0]?.title).toContain("（9/27）");
    expect((await startPlayback(context, studentActor, list.page.items[0]?.id ?? "")).grant.kind).toBe("youtube");

    const guardian = await loadActor(context, (await signInWithPassword(context, { loginId: "parent@example.invalid", password: "guardian-pass-1" })).userId);
    expect(guardian?.linkedStudentIds).toEqual([approved.studentUserId]);
    await expect(acceptInvitation(context, { token: approved.invitation.token, guardianPassword: "a-a-a-a-1", studentPassword: "b-b-b-b-1" })).rejects.toMatchObject({ code: "invalid" });
  });

  it("承認の途中で失敗したら、何も残さない（トランザクション）", async () => {
    const admin = await createAdmin();
    const { applicationId } = await submitApplication(context, { ...application, guardianEmail: "owner@example.invalid" });
    const [before] = await client.query<{ count: number }>("select count(*)::int as count from members");
    await expect(approveApplication(context, admin, { applicationId, planCode: "light" })).rejects.toMatchObject({ code: "conflict" });
    const [after] = await client.query<{ count: number }>("select count(*)::int as count from members");
    expect(after?.count).toBe(before?.count);
    expect((await context.store.getApplication(applicationId))?.status).toBe("pending");
  });

  it("見送りにすると子どもの名前が消える", async () => {
    const admin = await createAdmin();
    const { applicationId } = await submitApplication(context, application);
    await rejectApplication(context, admin, { applicationId, note: "定員のため" });
    expect(await context.store.getApplication(applicationId)).toMatchObject({ status: "rejected", childFullName: "", reviewNote: "定員のため" });
  });

  it("退会するとログインできなくなり、ログイン中のセッションも消える", async () => {
    const admin = await createAdmin();
    const approved = await approveApplication(context, admin, { applicationId: (await submitApplication(context, application)).applicationId, planCode: null });
    const loginId = (await acceptInvitation(context, { token: approved.invitation.token, guardianPassword: "guardian-pass-1", studentPassword: "student-pass-1" })).loginIds[1]?.loginId ?? "";
    const session = await signInWithPassword(context, { loginId, password: "student-pass-1" });
    await deleteMember(context, admin, { userId: approved.studentUserId, confirmDisplayName: "タロウ" });
    expect(await resolveSession(context, session.token)).toBeNull();
    await expect(signInWithPassword(context, { loginId, password: "student-pass-1" })).rejects.toMatchObject({ code: "unauthenticated" });
  });

  it("運営が発行したリンクで、運営以外の人もパスワードを決め直せる", async () => {
    const admin = await createAdmin();
    const approved = await approveApplication(context, admin, { applicationId: (await submitApplication(context, application)).applicationId, planCode: null });
    const issued = await issueAccountInvitation(context, admin, { userId: approved.studentUserId });
    const accepted = await acceptInvitation(context, { token: issued.token, password: "new-student-pass-1" });
    expect(accepted.loginIds[0]?.loginId).toMatch(/^ippo-\d{6}$/);
  });
});

describe("ポイント（SQL 版）", () => {
  it("同じキーは二重に付かず、同時に来ても日次上限を超えない", async () => {
    const admin = await createAdmin();
    const approved = await approveApplication(context, admin, { applicationId: (await submitApplication(context, application)).applicationId, planCode: "light" });
    const student = await loadActor(context, approved.studentUserId);
    const results = await Promise.all(["a", "b", "c", "d", "a"].map((subject) => awardForOwnAction(context, student, { ruleCode: "video_completed", subject })));
    expect(results.filter((result) => result.kind === "awarded")).toHaveLength(3);
    expect((await getPointSummary(context, student, approved.studentUserId)).balance).toBe(3);

    clock = new Date("2026-09-29T15:30:00.000Z"); // JST では翌日
    expect((await awardForOwnAction(context, student, { ruleCode: "video_completed", subject: "e" })).kind).toBe("awarded");
  });
});

describe("見学リンク（SQL）", () => {
  it("有効なリンクは1本だけ。作り直し・停止・見学用アカウントの作成が本番と同じSQLで動く", async () => {
    const { issueGuestLink, isActiveGuestToken, revokeGuestLink, GUEST_ACCOUNT_ID } = await import("@/server/services/guest-link-service");
    const admin = await createAdmin();
    const first = await issueGuestLink(context, admin);
    expect(await isActiveGuestToken(context, first.token)).toBe(true);
    const second = await issueGuestLink(context, admin);
    expect(await isActiveGuestToken(context, first.token)).toBe(false);
    expect(await isActiveGuestToken(context, second.token)).toBe(true);
    const rows = await client.query<{ count: number }>("select count(*)::int as count from guest_links where revoked_at is null");
    expect(rows[0]?.count).toBe(1);

    const guest = await loadActor(context, GUEST_ACCOUNT_ID);
    expect(guest?.role).toBe("student");
    const list = await listVideosForMember(context, guest, { category: undefined, page: 1 });
    expect(list.access.status).toBe("available");

    expect(await revokeGuestLink(context, admin)).toEqual({ revoked: 1 });
    expect(await isActiveGuestToken(context, second.token)).toBe(false);
    // 有効なリンクが2本になる書き込みは、データベースが断る
    await client.query("insert into guest_links (id, token_hash, created_by, created_at) values ('a', 'h1', 'x', now())");
    await expect(client.query("insert into guest_links (id, token_hash, created_by, created_at) values ('b', 'h2', 'x', now())")).rejects.toThrow();
  });
});
