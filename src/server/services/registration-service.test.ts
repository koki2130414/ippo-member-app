import { describe, expect, it } from "vitest";
import { DEMO_IDS } from "@/data/seed/ids";
import type { RegistrationApplicationOutput } from "@/domain/schemas";
import { createTestContext } from "../../../test/service-context";
import { acceptInvitation, previewInvitation } from "./account-service";
import { loadActor } from "./actor";
import { signInWithPassword } from "./auth-service";
import { approveApplication, listApplicationsForAdmin, rejectApplication, submitApplication } from "./registration-service";

const application: RegistrationApplicationOutput = {
  guardianEmail: "parent@example.invalid",
  childFullName: "架空 たろう",
  childDisplayName: "タロウ",
  grade: "e5",
  prefecture: "栃木県",
  consent: true,
};

describe("入会の申し込み → 承認 → パスワード設定 → ログイン", () => {
  it("承認すると生徒・保護者・紐付け・プランができ、招待リンクで2人ともログインできる", async () => {
    const harness = createTestContext({ seed: "empty" });
    const admin = await harness.actorOf(DEMO_IDS.admin);
    const { applicationId } = await submitApplication(harness.context, application);

    const pending = await listApplicationsForAdmin(harness.context, admin, { status: "pending", page: 1 });
    expect(pending.items.map((item) => item.id)).toEqual([applicationId]);

    const approved = await approveApplication(harness.context, admin, { applicationId, planCode: "balance" });
    expect(approved.reusedGuardian).toBe(false);
    const student = await harness.context.store.getPrivateProfile(approved.studentUserId);
    expect(student).toMatchObject({ fullName: "架空 たろう", grade: "e5", prefecture: "栃木県", email: null });
    expect((await harness.context.store.getPublicProfile(approved.studentUserId))).toMatchObject({ displayName: "タロウ", ageBand: "elementary_upper", role: "student" });
    expect((await harness.context.store.getActiveMembership(approved.studentUserId))?.planCode).toBe("balance");

    const preview = await previewInvitation(harness.context, approved.invitation.token);
    expect(preview).toMatchObject({ ok: true, preview: { purpose: "family_setup", studentDisplayName: "タロウ", guardianLabel: "parent@example.invalid" } });

    const accepted = await acceptInvitation(harness.context, { token: approved.invitation.token, guardianPassword: "guardian-pass-1", studentPassword: "student-pass-1" });
    const [guardianLogin, studentLogin] = accepted.loginIds;
    expect(guardianLogin?.loginId).toBe("parent@example.invalid");
    expect(studentLogin?.loginId).toMatch(/^ippo-\d{6}$/);

    const guardianSignIn = await signInWithPassword(harness.context, { loginId: "parent@example.invalid", password: "guardian-pass-1" });
    const guardian = await loadActor(harness.context, guardianSignIn.userId);
    expect(guardian?.linkedStudentIds).toEqual([approved.studentUserId]);
    expect((await signInWithPassword(harness.context, { loginId: studentLogin?.loginId ?? "", password: "student-pass-1" })).userId).toBe(approved.studentUserId);

    const actions = harness.state.auditLogs.map((log) => log.action);
    expect(actions).toEqual(expect.arrayContaining(["application.approve", "invitation.accept"]));
    // 監査ログに子どもの名前やメールを書き写さない
    expect(JSON.stringify(harness.state.auditLogs)).not.toMatch(/架空|parent@/);
  });

  it("同じ申し込みを2回承認できない", async () => {
    const harness = createTestContext({ seed: "empty" });
    const admin = await harness.actorOf(DEMO_IDS.admin);
    const { applicationId } = await submitApplication(harness.context, application);
    await approveApplication(harness.context, admin, { applicationId, planCode: null });
    await expect(approveApplication(harness.context, admin, { applicationId, planCode: null })).rejects.toMatchObject({ userMessage: expect.stringContaining("すでに承認") });
    expect(harness.state.publicProfiles.filter((profile) => profile.displayName === "タロウ")).toHaveLength(1);
  });

  it("きょうだいの申し込みは、同じ保護者に紐づける", async () => {
    const harness = createTestContext({ seed: "empty" });
    const admin = await harness.actorOf(DEMO_IDS.admin);
    const first = await approveApplication(harness.context, admin, { applicationId: (await submitApplication(harness.context, application)).applicationId, planCode: null });
    const second = await approveApplication(harness.context, admin, {
      applicationId: (await submitApplication(harness.context, { ...application, childFullName: "架空 はなこ", childDisplayName: "ハナコ", grade: "e2" })).applicationId,
      planCode: null,
    });
    expect(second.reusedGuardian).toBe(true);
    expect(second.guardianUserId).toBe(first.guardianUserId);
    expect((await loadActor(harness.context, first.guardianUserId))?.linkedStudentIds).toEqual([first.studentUserId, second.studentUserId]);
  });

  it("承認の途中で失敗したら、何も残さない", async () => {
    const harness = createTestContext({ seed: "empty" });
    const admin = await harness.actorOf(DEMO_IDS.admin);
    // 保護者のメールが運営アカウントと同じ → 途中で断られる
    const { applicationId } = await submitApplication(harness.context, { ...application, guardianEmail: "admin@example.invalid" });
    const before = harness.state.publicProfiles.length;
    await expect(approveApplication(harness.context, admin, { applicationId, planCode: "light" })).rejects.toMatchObject({ code: "conflict" });
    expect(harness.state.publicProfiles.length).toBe(before);
    expect((await harness.context.store.getApplication(applicationId))?.status).toBe("pending");
  });
});

describe("見送り", () => {
  it("子どもの名前を消し、メモは監査ログに書き写さない", async () => {
    const harness = createTestContext({ seed: "empty" });
    const admin = await harness.actorOf(DEMO_IDS.admin);
    const { applicationId } = await submitApplication(harness.context, application);
    await rejectApplication(harness.context, admin, { applicationId, note: "定員のため（秘密のメモ）" });
    const rejected = await harness.context.store.getApplication(applicationId);
    expect(rejected).toMatchObject({ status: "rejected", childFullName: "", reviewNote: "定員のため（秘密のメモ）" });
    expect(JSON.stringify(harness.state.auditLogs)).not.toContain("秘密のメモ");
    await expect(approveApplication(harness.context, admin, { applicationId, planCode: null })).rejects.toMatchObject({ code: "conflict" });
  });
});

describe("申し込みの受け付け", () => {
  it("同じメールで審査待ちが3件あれば、それ以上は受け付けない", async () => {
    const harness = createTestContext({ seed: "empty" });
    for (let index = 0; index < 3; index += 1) await submitApplication(harness.context, application);
    await expect(submitApplication(harness.context, application)).rejects.toMatchObject({ code: "conflict" });
  });

  it("運営以外は申し込みの一覧を見られない", async () => {
    const harness = createTestContext();
    for (const userId of [DEMO_IDS.student, DEMO_IDS.guardian, DEMO_IDS.coach]) {
      await expect(listApplicationsForAdmin(harness.context, await harness.actorOf(userId), { status: "pending", page: 1 })).rejects.toMatchObject({ code: "forbidden" });
    }
  });
});
