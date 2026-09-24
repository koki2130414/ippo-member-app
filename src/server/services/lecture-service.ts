import { toQuizQuestionPublic, toVideoSummary, type QuizQuestionPublic, type VideoSummary } from "@/domain/dto";
import { checkViewCompletion, describeCompletionCheck, minimumLectureReadSeconds } from "@/domain/learning";
import type { Entitlement } from "@/domain/plans";
import { findUnanswered, gradeQuiz, type Answers } from "@/domain/scoring";
import type { Actor, Lecture, LectureCategory } from "@/domain/types";
import type { Page } from "@/data/data-store";
import { evaluateAccess } from "./access";
import type { ServiceContext } from "./context";
import { ServiceError, invalid, notFound } from "./errors";
import { requireRole } from "./guards";
import { awardForOwnAction, type AwardOutcome } from "./points-service";

/**
 * 講義とクイズのサービス層。
 * クイズの設問は QuizQuestionPublic（正解フラグと解説を落とした形）でしか返さない。
 * 採点はここで行い、正解と解説は「送信のあと」の結果にだけ入れる。
 */

const MEMBER_ROLES = ["student", "guardian"] as const;
export const LECTURE_PAGE_SIZE = 12;

export interface LectureListView {
  categories: LectureCategory[];
  page: Page<Pick<Lecture, "id" | "categoryId" | "title">>;
  completedLectureIds: string[];
  passedLectureIds: string[];
  access: Entitlement;
}

export async function listLecturesForMember(context: ServiceContext, actor: Actor | null, query: { categoryId: string | undefined; page: number }): Promise<LectureListView> {
  const member = requireRole(actor, MEMBER_ROLES, "lecture.list");
  const [categories, page, access, progress] = await Promise.all([
    context.store.listLectureCategories(),
    context.store.listLectures({ categoryId: query.categoryId, page: query.page, pageSize: LECTURE_PAGE_SIZE, publishedOnly: true }),
    evaluateAccess(context, member, "lectures"),
    member.role === "student" ? context.store.listLectureProgress(member.userId) : Promise.resolve([]),
  ]);
  return {
    categories,
    // 一覧には本文を載せない（ページが重くなるのと、一覧で読めてしまうと講義を開く意味が薄れるため）
    page: { ...page, items: page.items.map(({ id, categoryId, title }) => ({ id, categoryId, title })) },
    completedLectureIds: progress.filter((item) => item.completedAt !== null).map((item) => item.lectureId),
    passedLectureIds: progress.filter((item) => item.quizPassedAt !== null).map((item) => item.lectureId),
    access,
  };
}

export interface LectureDetailView {
  lecture: Pick<Lecture, "id" | "categoryId" | "title" | "body">;
  categoryName: string | null;
  video: VideoSummary | null;
  questions: QuizQuestionPublic[];
  minimumReadSeconds: number;
  completed: boolean;
  quizPassed: boolean;
  access: Entitlement;
  canEarnPoints: boolean;
}

export async function getLectureDetail(context: ServiceContext, actor: Actor | null, lectureId: string): Promise<LectureDetailView> {
  const member = requireRole(actor, MEMBER_ROLES, "lecture.detail");
  const lecture = await context.store.getLecture(lectureId);
  if (!lecture || lecture.publishedAt === null) throw notFound("lecture.detail");
  const [categories, questions, video, access, progress] = await Promise.all([
    context.store.listLectureCategories(),
    context.store.listQuizQuestions(lecture.id),
    lecture.videoId ? context.store.getVideo(lecture.videoId) : Promise.resolve(null),
    evaluateAccess(context, member, "lectures"),
    member.role === "student" ? context.store.getLectureProgress(member.userId, lecture.id) : Promise.resolve(null),
  ]);
  const hasAccess = access.status === "available";
  return {
    // 使えない人には本文も設問も渡さない（画面で隠すだけにしない）
    lecture: { id: lecture.id, categoryId: lecture.categoryId, title: lecture.title, body: hasAccess ? lecture.body : "" },
    categoryName: categories.find((category) => category.id === lecture.categoryId)?.name ?? null,
    video: hasAccess && video && video.publishedAt !== null ? toVideoSummary(video) : null,
    questions: hasAccess ? questions.map(toQuizQuestionPublic) : [],
    minimumReadSeconds: minimumLectureReadSeconds(lecture),
    completed: progress?.completedAt != null,
    quizPassed: progress?.quizPassedAt != null,
    access,
    canEarnPoints: member.role === "student",
  };
}

async function requireLectureAccess(context: ServiceContext, actor: Actor, lectureId: string): Promise<Lecture> {
  const lecture = await context.store.getLecture(lectureId);
  if (!lecture || lecture.publishedAt === null) throw notFound("lecture");
  const access = await evaluateAccess(context, actor, "lectures");
  if (access.status !== "available") throw new ServiceError("forbidden", "プランに加入すると講義が読めます。プランのページを見てみよう", `lecture:${access.status}`);
  return lecture;
}

/** 講義を開いたときに、ブラウザから POST で呼ばれる。読み終わりの判定の起点になる */
export async function startLectureReading(context: ServiceContext, actor: Actor | null, lectureId: string): Promise<{ viewSessionId: string }> {
  const student = requireRole(actor, ["student"], "lecture.start");
  const lecture = await requireLectureAccess(context, student, lectureId);
  const viewSessionId = context.newId();
  await context.store.createViewSession({ id: viewSessionId, userId: student.userId, kind: "lecture", targetId: lecture.id, startedAt: context.now().toISOString() });
  return { viewSessionId };
}

export type CompleteLectureResult = { kind: "completed"; points: AwardOutcome } | { kind: "already_completed" };

export async function completeLecture(context: ServiceContext, actor: Actor | null, input: { lectureId: string; viewSessionId: string }): Promise<CompleteLectureResult> {
  const student = requireRole(actor, ["student"], "lecture.complete");
  const lecture = await requireLectureAccess(context, student, input.lectureId);
  const check = checkViewCompletion({
    session: await context.store.getViewSession(input.viewSessionId),
    userId: student.userId,
    kind: "lecture",
    targetId: lecture.id,
    minimumSeconds: minimumLectureReadSeconds(lecture),
    now: context.now(),
  });
  const message = describeCompletionCheck(check, "lecture");
  if (message !== null) throw invalid(message, "lecture.complete:check");

  const { firstTime } = await context.store.markLectureCompleted({ userId: student.userId, lectureId: lecture.id, completedAt: context.now().toISOString() });
  if (!firstTime) return { kind: "already_completed" };
  return { kind: "completed", points: await awardForOwnAction(context, student, { ruleCode: "lecture_completed", subject: lecture.id }) };
}

export interface QuizSubmissionResult {
  correctCount: number;
  total: number;
  passed: boolean;
  perQuestion: { questionId: string; correct: boolean; correctChoiceId: string | null; explanation: string }[];
  points: AwardOutcome | null;
}

/** クイズの採点。何度でも挑戦できる。ポイントは初めて合格したときだけ（冪等キーでも二重に付かない） */
export async function submitQuiz(context: ServiceContext, actor: Actor | null, input: { lectureId: string; answers: Answers }): Promise<QuizSubmissionResult> {
  const student = requireRole(actor, ["student"], "quiz.submit");
  const lecture = await requireLectureAccess(context, student, input.lectureId);
  const questions = await context.store.listQuizQuestions(lecture.id);
  if (questions.length === 0) throw invalid("この講義にはクイズがありません");
  if (findUnanswered(questions, input.answers).length > 0) throw invalid("まだ答えていない問題があります。ぜんぶ答えてから送ってね");

  const result = gradeQuiz(questions, input.answers, lecture.quizPassRatio);
  let points: AwardOutcome | null = null;
  if (result.passed) {
    await context.store.markQuizPassed({ userId: student.userId, lectureId: lecture.id, passedAt: context.now().toISOString() });
    points = await awardForOwnAction(context, student, { ruleCode: "quiz_passed", subject: lecture.id });
  }
  return { ...result, points };
}
