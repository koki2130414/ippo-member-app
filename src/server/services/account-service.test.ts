import { describe, expect, it } from "vitest";
import { DEMO_IDS } from "@/data/seed/ids";
import { STUDENT_LOGIN_ID_PATTERN } from "@/domain/registration";
import { createTestContext } from "../../../test/service-context";
import { acceptInvitation, canSetupFirstAdmin, issueAccountInvitation, previewInvitation, setupFirstAdmin } from "./account-service";
import { loadActor } from "./actor";
import { signInWithPassword } from "./auth-service";
import { deleteMember } from "./members-service";
import { resolveSession } from "./session-service";

function withoutAdmins(harness: ReturnType<typeof createTestContext>) {
  harness.state.publicProfiles = harness.state.publicProfiles.filter((profile) => profile.role !== "admin");
}

describe("最初の運営アカウント", () => {
  it("運営がいないときだけ作れ、作ったらそのままログインでき、2回目は断る", async () => {
    const harness = createTestContext({ seed: "empty" });
    expect(await canSetupFirstAdmin(harness.context)).toBe(false);
    withoutAdmins(harness);
    expect(await canSetupFirstAdmin(harness.context)).toBe(true);

    const created = await setupFirstAdmin(harness.context, { displayName: "運営", email: "owner@example.invalid", password: "correct-horse-1" });
    expect(await resolveSession(harness.context, created.token)).toBe(created.userId);
    expect((await loadActor(harness.context, created.userId))?.role).toBe("admin");

    const signedIn = await signInWithPassword(harness.context, { loginId: "OWNER@example.invalid", password: "correct-horse-1" });
    expect(signedIn.userId).toBe(created.userId);
    await expect(setupFirstAdmin(harness.context, { displayName: "別人", email: "x@example.invalid", password: "correct-horse-2" })).rejects.toMatchObject({ code: "conflict" });
    // パスワードそのものは保存しない
    expect(JSON.stringify(harness.state)).not.toContain("correct-horse-1");
  });
});

describe("ログイン用リンク（1人分）", () => {
  it("生徒は ippo- から始まるログインIDが発行され、パスワードでログインできる", async () => {
    const harness = createTestContext();
    const admin = await harness.actorOf(DEMO_IDS.admin);
    const issued = await issueAccountInvitation(harness.context, admin, { userId: DEMO_IDS.student });
    expect(JSON.stringify(harness.state.invitations)).not.toContain(issued.token);

    const preview = await previewInvitation(harness.context, issued.token);
    expect(preview).toMatchObject({ ok: true, preview: { purpose: "account_setup", accountDisplayName: "ヒカル（サンプル）", accountRole: "student" } });

    const accepted = await acceptInvitation(harness.context, { token: issued.token, password: "hikaru-pass-1" });
    const loginId = accepted.loginIds[0]?.loginId ?? "";
    expect(loginId).toMatch(STUDENT_LOGIN_ID_PATTERN);
    expect((await signInWithPassword(harness.context, { loginId, password: "hikaru-pass-1" })).userId).toBe(DEMO_IDS.student);
  });

  it("同じリンクは2回使えない", async () => {
    const harness = createTestContext();
    const issued = await issueAccountInvitation(harness.context, await harness.actorOf(DEMO_IDS.admin), { userId: DEMO_IDS.student });
    await acceptInvitation(harness.context, { token: issued.token, password: "hikaru-pass-1" });
    await expect(acceptInvitation(harness.context, { token: issued.token, password: "other-pass-2" })).rejects.toMatchObject({ userMessage: expect.stringContaining("もう使われています") });
    expect(await previewInvitation(harness.context, issued.token)).toMatchObject({ ok: false });
  });

  it("期限切れのリンクは使えない", async () => {
    const harness = createTestContext({ now: "2026-09-01T00:00:00.000Z" });
    const issued = await issueAccountInvitation(harness.context, await harness.actorOf(DEMO_IDS.admin), { userId: DEMO_IDS.student });
    harness.setNow("2026-09-20T00:00:00.000Z");
    await expect(acceptInvitation(harness.context, { token: issued.token, password: "hikaru-pass-1" })).rejects.toMatchObject({ userMessage: expect.stringContaining("有効期限") });
  });

  it("パスワードを決め直すと、ほかの端末のログインは切れる", async () => {
    const harness = createTestContext();
    const admin = await harness.actorOf(DEMO_IDS.admin);
    const first = await acceptInvitation(harness.context, { token: (await issueAccountInvitation(harness.context, admin, { userId: DEMO_IDS.coach })).token, password: "coach-pass-1" });
    expect(first.loginIds[0]?.loginId).toBe(`${DEMO_IDS.coach}@example.invalid`);
    const second = await acceptInvitation(harness.context, { token: (await issueAccountInvitation(harness.context, admin, { userId: DEMO_IDS.coach })).token, password: "coach-pass-2" });
    expect(await resolveSession(harness.context, first.token)).toBeNull();
    expect(await resolveSession(harness.context, second.token)).toBe(DEMO_IDS.coach);
    await expect(signInWithPassword(harness.context, { loginId: first.loginIds[0]?.loginId ?? "", password: "coach-pass-1" })).rejects.toMatchObject({ code: "unauthenticated" });
  });

  it("運営以外はリンクを発行できない", async () => {
    const harness = createTestContext();
    await expect(issueAccountInvitation(harness.context, await harness.actorOf(DEMO_IDS.coach), { userId: DEMO_IDS.student })).rejects.toMatchObject({ code: "forbidden" });
  });
});

describe("パスワードでのログイン", () => {
  it("IDがちがうときもパスワードがちがうときも、同じ文言で断る", async () => {
    const harness = createTestContext();
    const issued = await issueAccountInvitation(harness.context, await harness.actorOf(DEMO_IDS.admin), { userId: DEMO_IDS.student });
    const loginId = (await acceptInvitation(harness.context, { token: issued.token, password: "hikaru-pass-1" })).loginIds[0]?.loginId ?? "";
    const wrongPassword = signInWithPassword(harness.context, { loginId, password: "nope-nope-1" });
    const unknownId = signInWithPassword(harness.context, { loginId: "ippo-000000", password: "hikaru-pass-1" });
    await expect(wrongPassword).rejects.toMatchObject({ code: "unauthenticated" });
    await expect(unknownId).rejects.toMatchObject({ code: "unauthenticated" });
    const [a, b] = await Promise.allSettled([wrongPassword, unknownId]);
    expect(a.status === "rejected" && b.status === "rejected" && a.reason.userMessage === b.reason.userMessage).toBe(true);
  });

  it("退会した会員はログインできない", async () => {
    const harness = createTestContext();
    const admin = await harness.actorOf(DEMO_IDS.admin);
    const issued = await issueAccountInvitation(harness.context, admin, { userId: DEMO_IDS.student });
    const loginId = (await acceptInvitation(harness.context, { token: issued.token, password: "hikaru-pass-1" })).loginIds[0]?.loginId ?? "";
    await deleteMember(harness.context, admin, { userId: DEMO_IDS.student, confirmDisplayName: "ヒカル（サンプル）" });
    await expect(signInWithPassword(harness.context, { loginId, password: "hikaru-pass-1" })).rejects.toMatchObject({ code: "unauthenticated" });
  });
});
