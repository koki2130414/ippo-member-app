import { describe, expect, it } from "vitest";
import { DEMO_IDS } from "@/data/seed/ids";
import { createTestContext } from "../../../test/service-context";
import { endSession, resolveSession, startSession } from "./session-service";

describe("データベースに保存するセッション", () => {
  it("トークンからログイン中の人が分かり、DB にはトークンそのものを置かない", async () => {
    const harness = createTestContext();
    const { token } = await startSession(harness.context, DEMO_IDS.student);
    expect(await resolveSession(harness.context, token)).toBe(DEMO_IDS.student);
    expect(JSON.stringify(harness.state.sessions)).not.toContain(token);
  });

  it("期限が切れたら使えない", async () => {
    const harness = createTestContext({ now: "2026-09-01T00:00:00.000Z" });
    const { token } = await startSession(harness.context, DEMO_IDS.student);
    harness.setNow("2026-09-16T00:00:00.000Z");
    expect(await resolveSession(harness.context, token)).toBeNull();
  });

  it("ログアウトしたら使えない。でたらめなトークンも使えない", async () => {
    const harness = createTestContext();
    const { token } = await startSession(harness.context, DEMO_IDS.student);
    await endSession(harness.context, token);
    expect(await resolveSession(harness.context, token)).toBeNull();
    expect(await resolveSession(harness.context, "x".repeat(43))).toBeNull();
    expect(await resolveSession(harness.context, undefined)).toBeNull();
  });
});
