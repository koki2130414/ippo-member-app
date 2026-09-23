import { describe, expect, it } from "vitest";
import { DEMO_IDS } from "@/data/seed/ids";
import { DELETED_DISPLAY_NAME } from "@/domain/members";
import { createTestContext } from "../../../test/service-context";
import { loadActor } from "./actor";
import { assignPlan, createMember, deleteMember } from "./members-service";
import { getPointSummary } from "./points-service";

describe("会員削除", () => {
  it("個人情報を消し、紐付けを外し、履歴は残し、監査ログに本名を書かない", async () => {
    const harness = createTestContext();
    const admin = await harness.actorOf(DEMO_IDS.admin);
    const transactionsBefore = harness.state.pointTransactions.filter((tx) => tx.userId === DEMO_IDS.student).length;

    await deleteMember(harness.context, admin, { userId: DEMO_IDS.student, confirmDisplayName: "ヒカル（サンプル）" });

    const publicProfile = await harness.context.store.getPublicProfile(DEMO_IDS.student);
    const privateProfile = await harness.context.store.getPrivateProfile(DEMO_IDS.student);
    expect(publicProfile?.displayName).toBe(DELETED_DISPLAY_NAME);
    expect(privateProfile?.fullName).toBe("");
    expect(privateProfile?.deletedAt).not.toBeNull();
    expect(harness.state.pointTransactions.filter((tx) => tx.userId === DEMO_IDS.student)).toHaveLength(transactionsBefore);
    expect(await harness.context.store.getActiveMembership(DEMO_IDS.student)).toBeNull();

    // 退会した本人はログインできず、保護者・コーチの経路も切れる
    expect(await loadActor(harness.context, DEMO_IDS.student)).toBeNull();
    const guardian = await harness.actorOf(DEMO_IDS.guardian);
    expect(guardian.linkedStudentIds).not.toContain(DEMO_IDS.student);
    await expect(getPointSummary(harness.context, guardian, DEMO_IDS.student)).rejects.toMatchObject({ code: "forbidden" });
    const coach = await harness.actorOf(DEMO_IDS.coach);
    expect(coach.assignedStudentIds).not.toContain(DEMO_IDS.student);

    const audit = harness.state.auditLogs.filter((log) => log.action === "member.delete");
    expect(audit).toHaveLength(1);
    expect(JSON.stringify(audit)).not.toMatch(/架空|ヒカル|example\.invalid/);
  });

  it("表示名の打ち直しが違えば削除しない", async () => {
    const harness = createTestContext();
    const admin = await harness.actorOf(DEMO_IDS.admin);
    await expect(deleteMember(harness.context, admin, { userId: DEMO_IDS.student, confirmDisplayName: "ヒカル" })).rejects.toMatchObject({ code: "invalid" });
    expect((await harness.context.store.getPrivateProfile(DEMO_IDS.student))?.deletedAt).toBeNull();
  });

  it("運営以外は削除できない", async () => {
    const harness = createTestContext();
    for (const userId of [DEMO_IDS.student, DEMO_IDS.guardian, DEMO_IDS.coach]) {
      const actor = await harness.actorOf(userId);
      await expect(deleteMember(harness.context, actor, { userId: DEMO_IDS.student2, confirmDisplayName: "ミナト（サンプル）" })).rejects.toMatchObject({ code: "forbidden" });
    }
  });

  it("最後の運営は消せない（自分自身も消せない）", async () => {
    const harness = createTestContext();
    const admin = await harness.actorOf(DEMO_IDS.admin);
    await expect(deleteMember(harness.context, admin, { userId: DEMO_IDS.admin, confirmDisplayName: "運営" })).rejects.toMatchObject({ code: "invalid" });
  });
});

describe("会員追加とプラン割り当て", () => {
  it("追加すると監査ログが残り、同じメールは弾く", async () => {
    const harness = createTestContext({ seed: "empty" });
    const admin = await harness.actorOf(DEMO_IDS.admin);
    const input = { displayName: "テスト", fullName: "架空 てすと", email: "test@example.invalid", role: "student" as const, planCode: "balance" as const, ageBand: null };
    const { userId } = await createMember(harness.context, admin, input);
    expect((await harness.context.store.getActiveMembership(userId))?.planCode).toBe("balance");
    expect(harness.state.auditLogs.map((log) => log.action)).toEqual(["member.create"]);
    await expect(createMember(harness.context, admin, input)).rejects.toMatchObject({ code: "conflict" });
  });

  it("プランは生徒にだけ割り当てられ、変更前後が監査ログに残る", async () => {
    const harness = createTestContext();
    const admin = await harness.actorOf(DEMO_IDS.admin);
    await assignPlan(harness.context, admin, { userId: DEMO_IDS.student3, planCode: "soccer_iq" });
    expect((await harness.context.store.getActiveMembership(DEMO_IDS.student3))?.planCode).toBe("soccer_iq");
    expect(harness.state.auditLogs.at(-1)?.metadata).toEqual({ from: "light", to: "soccer_iq" });
    await expect(assignPlan(harness.context, admin, { userId: DEMO_IDS.coach, planCode: "light" })).rejects.toMatchObject({ code: "invalid" });
  });
});
