import { describe, expect, it } from "vitest";
import { DEMO_IDS } from "@/data/seed/ids";
import { createTestContext } from "../../../test/service-context";
import { completeLecture, getLectureDetail, listLecturesForMember, startLectureReading, submitQuiz } from "./lecture-service";

function correctAnswers(harness: ReturnType<typeof createTestContext>, lectureId: string): Record<string, string> {
  return Object.fromEntries(
    harness.state.quizQuestions.filter((question) => question.lectureId === lectureId).map((question) => [question.id, question.choices.find((choice) => choice.isCorrect)?.id ?? ""]),
  );
}

describe("講義の一覧と詳細", () => {
  it("詳細の設問に正解フラグと解説が入っていない", async () => {
    const harness = createTestContext();
    const detail = await getLectureDetail(harness.context, await harness.actorOf(DEMO_IDS.student), "lecture-reset");
    const text = JSON.stringify(detail);
    expect(detail.questions.length).toBe(3);
    expect(text).not.toContain("isCorrect");
    expect(text).not.toContain("explanation");
  });

  it("一覧には本文を載せない", async () => {
    const harness = createTestContext();
    const list = await listLecturesForMember(harness.context, await harness.actorOf(DEMO_IDS.student), { categoryId: undefined, page: 1 });
    expect(JSON.stringify(list)).not.toContain("深呼吸");
    expect(list.page.total).toBe(4);
  });

  it("未加入なら本文も設問も渡さない", async () => {
    const harness = createTestContext();
    harness.state.memberships = harness.state.memberships.filter((membership) => membership.userId !== DEMO_IDS.student3);
    const detail = await getLectureDetail(harness.context, await harness.actorOf(DEMO_IDS.student3), "lecture-scan");
    expect(detail.access.status).toBe("no_plan");
    expect(detail.lecture.body).toBe("");
    expect(detail.questions).toEqual([]);
  });
});

describe("読みおわり", () => {
  it("最低時間の前は待ってもらい、あとなら1回だけポイント", async () => {
    const harness = createTestContext({ now: "2026-09-24T03:00:00.000Z" });
    const student = await harness.actorOf(DEMO_IDS.student);
    const { viewSessionId } = await startLectureReading(harness.context, student, "lecture-scan");
    await expect(completeLecture(harness.context, student, { lectureId: "lecture-scan", viewSessionId })).rejects.toMatchObject({ userMessage: expect.stringContaining("もう少し読んで") });
    harness.setNow("2026-09-24T03:05:00.000Z");
    expect(await completeLecture(harness.context, student, { lectureId: "lecture-scan", viewSessionId })).toMatchObject({ kind: "completed", points: { kind: "awarded" } });
    expect(await completeLecture(harness.context, student, { lectureId: "lecture-scan", viewSessionId })).toEqual({ kind: "already_completed" });
  });
});

describe("クイズ", () => {
  it("未回答があると採点しない", async () => {
    const harness = createTestContext();
    await expect(submitQuiz(harness.context, await harness.actorOf(DEMO_IDS.student), { lectureId: "lecture-reset", answers: {} })).rejects.toMatchObject({ userMessage: expect.stringContaining("まだ答えていない") });
  });

  it("全問正解で合格し、ポイントは初回だけ。解説は採点結果にだけ入る", async () => {
    const harness = createTestContext();
    const student = await harness.actorOf(DEMO_IDS.student);
    const answers = correctAnswers(harness, "lecture-reset");
    const first = await submitQuiz(harness.context, student, { lectureId: "lecture-reset", answers });
    expect(first).toMatchObject({ correctCount: 3, total: 3, passed: true, points: { kind: "awarded", amount: 1 } });
    expect(first.perQuestion[1]?.explanation).toContain("深呼吸");
    const second = await submitQuiz(harness.context, student, { lectureId: "lecture-reset", answers });
    expect(second.points).toEqual({ kind: "already_awarded" });
  });

  it("不合格ならポイントは付かない", async () => {
    const harness = createTestContext();
    const student = await harness.actorOf(DEMO_IDS.student);
    const wrong = Object.fromEntries(
      harness.state.quizQuestions.filter((question) => question.lectureId === "lecture-reset").map((question) => [question.id, question.choices.find((choice) => !choice.isCorrect)?.id ?? ""]),
    );
    const result = await submitQuiz(harness.context, student, { lectureId: "lecture-reset", answers: wrong });
    expect(result).toMatchObject({ correctCount: 0, passed: false, points: null });
  });

  it("保護者はクイズを送れない", async () => {
    const harness = createTestContext();
    await expect(submitQuiz(harness.context, await harness.actorOf(DEMO_IDS.guardian), { lectureId: "lecture-reset", answers: {} })).rejects.toMatchObject({ code: "forbidden" });
  });
});
