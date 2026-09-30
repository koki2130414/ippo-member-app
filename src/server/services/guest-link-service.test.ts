import { describe, expect, it } from "vitest";
import { DEMO_IDS } from "@/data/seed/ids";
import { createTestContext } from "../../../test/service-context";
import { GUEST_ACCOUNT_ID, getGuestLinkStatus, isActiveGuestToken, issueGuestLink, revokeGuestLink } from "./guest-link-service";
import { completeVideo, startPlayback } from "./video-service";
import { loadActor } from "./actor";

describe("見学リンク", () => {
  it("運営が作ったリンクだけが有効で、作り直すと前のリンクは使えなくなる", async () => {
    const harness = createTestContext();
    const admin = await harness.actorOf(DEMO_IDS.admin);
    expect(await getGuestLinkStatus(harness.context, admin)).toEqual({ active: false, createdAt: null });

    const first = await issueGuestLink(harness.context, admin);
    expect(first.token.length).toBeGreaterThanOrEqual(32);
    expect(await isActiveGuestToken(harness.context, first.token)).toBe(true);
    // トークンそのものは保存しない
    expect(harness.state.guestLinks.some((link) => link.tokenHash === first.token)).toBe(false);

    const second = await issueGuestLink(harness.context, admin);
    expect(await isActiveGuestToken(harness.context, first.token)).toBe(false);
    expect(await isActiveGuestToken(harness.context, second.token)).toBe(true);
    expect(harness.state.guestLinks.filter((link) => link.revokedAt === null)).toHaveLength(1);

    expect(await revokeGuestLink(harness.context, admin)).toEqual({ revoked: 1 });
    expect(await isActiveGuestToken(harness.context, second.token)).toBe(false);
    expect((await getGuestLinkStatus(harness.context, admin)).active).toBe(false);
    expect(harness.state.auditLogs.map((log) => log.action)).toEqual(["guest_link.issue", "guest_link.issue", "guest_link.revoke"]);
  });

  it("でたらめなトークン・空・短いトークンは通さない", async () => {
    const harness = createTestContext();
    await issueGuestLink(harness.context, await harness.actorOf(DEMO_IDS.admin));
    for (const token of [undefined, "", "1", "x".repeat(43)]) {
      expect(await isActiveGuestToken(harness.context, token)).toBe(false);
    }
  });

  it("運営以外はリンクを作れず、止められず、状態も見られない", async () => {
    const harness = createTestContext();
    for (const userId of [DEMO_IDS.student, DEMO_IDS.guardian, DEMO_IDS.coach]) {
      const actor = await harness.actorOf(userId);
      await expect(issueGuestLink(harness.context, actor)).rejects.toMatchObject({ code: "forbidden" });
      await expect(revokeGuestLink(harness.context, actor)).rejects.toMatchObject({ code: "forbidden" });
      await expect(getGuestLinkStatus(harness.context, actor)).rejects.toMatchObject({ code: "forbidden" });
    }
    await expect(issueGuestLink(harness.context, null)).rejects.toMatchObject({ code: "unauthenticated" });
  });

  it("見学用アカウントが無いときは作る。見学では記録もポイントもつかない", async () => {
    const harness = createTestContext();
    harness.state.publicProfiles = harness.state.publicProfiles.filter((profile) => profile.userId !== GUEST_ACCOUNT_ID);
    harness.state.privateProfiles = harness.state.privateProfiles.filter((profile) => profile.userId !== GUEST_ACCOUNT_ID);
    harness.state.memberships = harness.state.memberships.filter((membership) => membership.userId !== GUEST_ACCOUNT_ID);
    await issueGuestLink(harness.context, await harness.actorOf(DEMO_IDS.admin));

    const guest = await loadActor(harness.context, GUEST_ACCOUNT_ID);
    expect(guest?.role).toBe("student");
    expect((await harness.context.store.getActiveMembership(GUEST_ACCOUNT_ID))?.planCode).toBe("light");
    const privateProfile = await harness.context.store.getPrivateProfile(GUEST_ACCOUNT_ID);
    expect(privateProfile?.email).toBeNull();

    const playback = await startPlayback(harness.context, guest, "video-sample-mux");
    expect(playback.viewSessionId).toBeNull();
    await expect(completeVideo(harness.context, guest, { videoId: "video-sample-mux", viewSessionId: "x" })).rejects.toMatchObject({ code: "invalid" });
  });
});
