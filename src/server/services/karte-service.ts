import { isGuestUserId } from "@/data/seed/ids";
import { toJstDate, addJstDays } from "@/domain/jst";
import {
  type FollowUp,
  type ReportRange,
  assessFollowUp,
  averageRating,
  canDeleteKarteEntry,
  canViewKarte,
  canViewStaffOnlyKarte,
  canWriteKarteEntry,
  canWriteKarteGoal,
  countActivities,
} from "@/domain/karte";
import { findPlan } from "@/domain/plans";
export type { KarteEntryView, KarteGoalView, KarteReport, KarteStudentRow, KarteStudentSummary, KarteView } from "@/domain/karte-view";
import type { Actor, KarteAction, KarteEntry, KarteEntryKind, KarteGoal, KarteGoalStatus, KarteGoalTerm, UserId } from "@/domain/types";
import { KARTE_ENTRY_KINDS } from "@/domain/types";
import type { KarteEntryView, KarteGoalView, KarteReport, KarteStudentRow, KarteStudentSummary, KarteView } from "@/domain/karte-view";
import type { ServiceContext } from "./context";
import { recordAudit } from "./audit";
import { forbidden, invalid, notFound } from "./errors";
import { requireActor, requireDecision } from "./guards";

/**
 * カルテ（個人の成長記録）。目標 → 行動計画 → 取り組み → 振り返り・フィードバック を一人ずつ積み上げる。
 * 権限のルールは domain/karte.ts。面談メモは担当コーチと運営だけで、それ以外の人には**取り出す段階で**含めない。
 */





async function studentSummary(context: ServiceContext, studentId: UserId): Promise<KarteStudentSummary> {
  const [profile, membership, plans] = await Promise.all([
    context.store.getPublicProfile(studentId),
    context.store.getActiveMembership(studentId),
    context.store.listPlans(),
  ]);
  if (!profile || profile.role !== "student") throw notFound("karte.student");
  return { userId: studentId, displayName: profile.displayName, planName: membership ? (findPlan(plans, membership.planCode)?.name ?? null) : null };
}

/** だれのカルテを開くか。本人は自分、保護者は紐づいた子（指定が無ければ最初の子）、コーチ・運営は指定が必須 */
export function resolveKarteStudentId(actor: Actor, requested: string | undefined): UserId {
  if (actor.role === "student") return actor.userId;
  if (actor.role === "guardian") {
    if (requested && actor.linkedStudentIds.includes(requested)) return requested;
    const first = actor.linkedStudentIds[0];
    if (!first) throw notFound("karte.no_child");
    return first;
  }
  if (!requested) throw notFound("karte.student_required");
  return requested;
}

function completedInRange(items: readonly { completedAt: string | null }[], from: string, to: string): number {
  return items.filter((item) => item.completedAt !== null && toJstDate(new Date(item.completedAt)) >= from && toJstDate(new Date(item.completedAt)) <= to).length;
}

async function decorateEntries(context: ServiceContext, entries: readonly KarteEntry[]): Promise<KarteEntryView[]> {
  const videoIds = [...new Set(entries.map((entry) => entry.modelVideoId).filter((id): id is string => id !== null))];
  const authorIds = [...new Set(entries.map((entry) => entry.authorId))];
  const [videos, authors] = await Promise.all([
    Promise.all(videoIds.map((id) => context.store.getVideo(id))),
    Promise.all(authorIds.map((id) => context.store.getPublicProfile(id))),
  ]);
  const videoTitle = new Map(videos.filter((video) => video !== null).map((video) => [video.id, video.title]));
  const authorName = new Map(authors.filter((author) => author !== null).map((author) => [author.userId, author.displayName]));
  return entries.map((entry) => ({ ...entry, modelVideoTitle: entry.modelVideoId ? (videoTitle.get(entry.modelVideoId) ?? null) : null, authorName: authorName.get(entry.authorId) ?? "" }));
}

function goalViews(goals: readonly KarteGoal[], actions: readonly KarteAction[], entries: readonly KarteEntry[]): KarteGoalView[] {
  // とりくみ中 → おやすみ → 達成。同じ状態ならシーズン（大きい目標）を先に
  const order: Record<KarteGoalStatus, number> = { active: 0, paused: 1, achieved: 2 };
  return [...goals]
    .sort((a, b) => order[a.status] - order[b.status] || Number(b.term === "season") - Number(a.term === "season") || b.startDate.localeCompare(a.startDate))
    .map((goal) => ({
      ...goal,
      actions: actions.filter((action) => action.goalId === goal.id && action.archivedAt === null),
      lastRating: entries.find((entry) => entry.kind === "reflection" && entry.goalId === goal.id && entry.rating !== null)?.rating ?? null,
    }));
}

export async function getKarte(context: ServiceContext, actor: Actor | null, requestedStudentId?: string): Promise<KarteView> {
  const viewer = requireActor(actor);
  const studentId = resolveKarteStudentId(viewer, requestedStudentId);
  requireDecision(canViewKarte(viewer, studentId), viewer, "karte.view");
  const seeStaffOnly = canViewStaffOnlyKarte(viewer, studentId).allowed;
  const today = toJstDate(context.now());
  const monthStart = `${today.slice(0, 7)}-01`;

  const [student, goals, actions, entries, videoProgress, lectureProgress] = await Promise.all([
    studentSummary(context, studentId),
    context.store.listKarteGoals(studentId),
    context.store.listKarteActions(studentId),
    context.store.listKarteEntries(studentId, { includeStaffOnly: seeStaffOnly }),
    context.store.listVideoProgress(studentId),
    context.store.listLectureProgress(studentId),
  ]);
  const monthEntries = entries.filter((entry) => entry.date >= monthStart && entry.date <= today);
  const guest = isGuestUserId(viewer.userId);
  const writeKinds = guest ? [] : KARTE_ENTRY_KINDS.filter((kind) => canWriteKarteEntry(viewer, studentId, kind).allowed);

  let followUp: FollowUp | null = null;
  if (seeStaffOnly) {
    const lastVideo = videoProgress.map((item) => item.completedAt).filter((at): at is string => at !== null).map((at) => toJstDate(new Date(at))).sort().at(-1) ?? null;
    const lastEntry = entries.find((entry) => entry.kind !== "interview")?.date ?? null;
    const lastActivity = [lastVideo, lastEntry].filter((date): date is string => date !== null).sort().at(-1) ?? null;
    followUp = assessFollowUp({ today, lastClassDate: entries.find((entry) => entry.kind === "class")?.date ?? null, lastActivityDate: lastActivity });
  }

  return {
    student,
    goals: goalViews(goals, actions, entries),
    entries: await decorateEntries(context, entries.slice(0, 40)),
    thisMonth: countActivities(monthEntries, completedInRange(videoProgress, monthStart, today), completedInRange(lectureProgress, monthStart, today)),
    monthLabel: `${Number(today.slice(5, 7))}月`,
    can: { writeGoal: !guest && canWriteKarteGoal(viewer, studentId).allowed, writeKinds, seeStaffOnly },
    followUp,
  };
}

// --- レポート（月次・半年。家庭向けなので面談メモは**だれが開いても**含めない） ---


export async function getKarteReport(context: ServiceContext, actor: Actor | null, input: { studentId?: string; range: ReportRange }): Promise<KarteReport> {
  const viewer = requireActor(actor);
  const studentId = resolveKarteStudentId(viewer, input.studentId);
  requireDecision(canViewKarte(viewer, studentId), viewer, "karte.report");
  const { range } = input;
  const span = Math.round((Date.parse(range.to) - Date.parse(range.from)) / 86_400_000) + 1;
  const previousTo = addJstDays(range.from, -1);
  const previousFrom = addJstDays(range.from, -span);

  const [student, goals, actions, entries, previousEntries, videoProgress, lectureProgress] = await Promise.all([
    studentSummary(context, studentId),
    context.store.listKarteGoals(studentId),
    context.store.listKarteActions(studentId),
    context.store.listKarteEntries(studentId, { from: range.from, to: range.to, includeStaffOnly: false }),
    context.store.listKarteEntries(studentId, { from: previousFrom, to: previousTo, includeStaffOnly: false }),
    context.store.listVideoProgress(studentId),
    context.store.listLectureProgress(studentId),
  ]);
  const decorated = await decorateEntries(context, entries);
  const inRange = videoProgress.filter((item) => item.completedAt !== null && toJstDate(new Date(item.completedAt)) >= range.from && toJstDate(new Date(item.completedAt)) <= range.to);
  const videos = await Promise.all(inRange.slice(0, 30).map((item) => context.store.getVideo(item.videoId)));
  const relevantGoals = goals.filter((goal) => goal.startDate <= range.to && goal.endDate >= range.from);

  return {
    student,
    range,
    goals: goalViews(relevantGoals, actions, entries),
    counts: countActivities(entries, inRange.length, completedInRange(lectureProgress, range.from, range.to)),
    previousCounts: countActivities(previousEntries, completedInRange(videoProgress, previousFrom, previousTo), completedInRange(lectureProgress, previousFrom, previousTo)),
    averageRating: averageRating(entries.filter((entry) => entry.kind === "reflection")),
    feedbacks: decorated.filter((entry) => entry.kind === "feedback"),
    personals: decorated.filter((entry) => entry.kind === "personal"),
    practices: decorated.filter((entry) => entry.kind === "practice"),
    reflections: decorated.filter((entry) => entry.kind === "reflection"),
    completedVideoTitles: videos.filter((video) => video !== null).map((video) => video.title),
    generatedOn: toJstDate(context.now()),
  };
}

// --- コーチ・運営: 生徒の一覧（フォローの目安つき） ---


export async function listKarteStudents(context: ServiceContext, actor: Actor | null): Promise<KarteStudentRow[]> {
  const viewer = requireActor(actor);
  if (viewer.role !== "coach" && viewer.role !== "admin") throw forbidden("karte.students:wrong_role");
  const studentIds =
    viewer.role === "coach"
      ? [...viewer.assignedStudentIds]
      : (await context.store.listMembers({ role: "student", page: 1, pageSize: 500 })).items.map((profile) => profile.userId).filter((id) => !isGuestUserId(id));
  const today = toJstDate(context.now());
  const from = addJstDays(today, -29);
  const rows = await Promise.all(
    studentIds.map(async (studentId) => {
      const view = await getKarte(context, viewer, studentId);
      const [entries, videoProgress, lectureProgress] = await Promise.all([
        context.store.listKarteEntries(studentId, { from, to: today, includeStaffOnly: false }),
        context.store.listVideoProgress(studentId),
        context.store.listLectureProgress(studentId),
      ]);
      return {
        ...view.student,
        last30: countActivities(entries, completedInRange(videoProgress, from, today), completedInRange(lectureProgress, from, today)),
        activeGoals: view.goals.filter((goal) => goal.status === "active").length,
        followUp: view.followUp ?? assessFollowUp({ today, lastClassDate: null, lastActivityDate: null }),
      };
    }),
  );
  // 声をかけたほうがよい子を上に
  return rows.sort((a, b) => Number(b.followUp.needed) - Number(a.followUp.needed) || a.displayName.localeCompare(b.displayName, "ja"));
}

// --- 書く ---

function requireNotGuest(actor: Actor, action: string): void {
  if (isGuestUserId(actor.userId)) throw forbidden(`${action}:guest`);
}

export interface SaveGoalInput {
  studentId: UserId;
  goalId?: string | undefined;
  term: KarteGoalTerm;
  title: string;
  reason: string;
  measure: string;
  startDate: string;
  endDate: string;
  status: KarteGoalStatus;
  progress: number;
}

export async function saveKarteGoal(context: ServiceContext, actor: Actor | null, input: SaveGoalInput): Promise<KarteGoal> {
  const writer = requireActor(actor);
  requireNotGuest(writer, "karte.goal_save");
  requireDecision(canWriteKarteGoal(writer, input.studentId), writer, "karte.goal_save");
  if (input.endDate < input.startDate) throw invalid("おわりの日は、はじまりの日より後にしてください");
  const now = context.now().toISOString();
  const existing = input.goalId ? await context.store.getKarteGoal(input.goalId) : null;
  if (input.goalId && (!existing || existing.studentId !== input.studentId)) throw notFound("karte.goal");
  const goal: KarteGoal = {
    id: existing?.id ?? context.newId(),
    studentId: input.studentId,
    term: input.term,
    title: input.title,
    reason: input.reason,
    measure: input.measure,
    startDate: input.startDate,
    endDate: input.endDate,
    status: input.status,
    progress: input.progress,
    createdBy: existing?.createdBy ?? writer.userId,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  await context.store.saveKarteGoal(goal);
  await recordAudit(context, writer, { action: "karte.goal_save", targetType: "karte_goal", targetId: goal.id, metadata: { studentId: input.studentId, created: existing === null } });
  return goal;
}

export async function addKarteAction(context: ServiceContext, actor: Actor | null, input: { goalId: string; text: string; frequency: string }): Promise<KarteAction> {
  const writer = requireActor(actor);
  requireNotGuest(writer, "karte.action_save");
  const goal = await context.store.getKarteGoal(input.goalId);
  if (!goal) throw notFound("karte.goal");
  requireDecision(canWriteKarteGoal(writer, goal.studentId), writer, "karte.action_save");
  const action: KarteAction = { id: context.newId(), goalId: goal.id, studentId: goal.studentId, text: input.text, frequency: input.frequency, createdBy: writer.userId, createdAt: context.now().toISOString(), archivedAt: null };
  await context.store.saveKarteAction(action);
  await recordAudit(context, writer, { action: "karte.action_save", targetType: "karte_action", targetId: action.id, metadata: { studentId: goal.studentId } });
  return action;
}

export async function archiveKarteAction(context: ServiceContext, actor: Actor | null, input: { actionId: string }): Promise<void> {
  const writer = requireActor(actor);
  requireNotGuest(writer, "karte.action_save");
  const action = await context.store.getKarteAction(input.actionId);
  if (!action) throw notFound("karte.action");
  requireDecision(canWriteKarteGoal(writer, action.studentId), writer, "karte.action_save");
  await context.store.saveKarteAction({ ...action, archivedAt: context.now().toISOString() });
  await recordAudit(context, writer, { action: "karte.action_save", targetType: "karte_action", targetId: action.id, metadata: { studentId: action.studentId, archived: true } });
}

export interface AddEntryInput {
  studentId: UserId;
  kind: KarteEntryKind;
  date: string;
  title: string;
  body: string;
  goalId?: string | undefined;
  rating?: number | undefined;
  videoUrl?: string | undefined;
  modelVideoId?: string | undefined;
}

export async function addKarteEntry(context: ServiceContext, actor: Actor | null, input: AddEntryInput): Promise<KarteEntry> {
  const writer = requireActor(actor);
  requireNotGuest(writer, "karte.entry_create");
  requireDecision(canWriteKarteEntry(writer, input.studentId, input.kind), writer, "karte.entry_create");
  if (input.date > toJstDate(context.now())) throw invalid("未来の日付には記録できません");
  if (input.goalId) {
    const goal = await context.store.getKarteGoal(input.goalId);
    if (!goal || goal.studentId !== input.studentId) throw notFound("karte.goal");
  }
  if (input.modelVideoId && !(await context.store.getVideo(input.modelVideoId))) throw invalid("お手本の動画が見つかりません。一覧からえらびなおしてください");
  const entry: KarteEntry = {
    id: context.newId(),
    studentId: input.studentId,
    kind: input.kind,
    date: input.date,
    title: input.title,
    body: input.body,
    goalId: input.goalId ?? null,
    rating: input.kind === "reflection" ? (input.rating ?? null) : null,
    videoUrl: input.videoUrl ?? null,
    modelVideoId: input.modelVideoId ?? null,
    authorId: writer.userId,
    authorRole: writer.role,
    createdAt: context.now().toISOString(),
  };
  await context.store.createKarteEntry(entry);
  // 監査ログには種類とIDだけ（本文は入れない）
  await recordAudit(context, writer, { action: "karte.entry_create", targetType: "karte_entry", targetId: entry.id, metadata: { studentId: input.studentId, kind: input.kind } });
  return entry;
}

export async function deleteKarteEntry(context: ServiceContext, actor: Actor | null, input: { entryId: string }): Promise<void> {
  const writer = requireActor(actor);
  requireNotGuest(writer, "karte.entry_delete");
  const entry = await context.store.getKarteEntry(input.entryId);
  // 見えない記録（他人のもの・面談メモ）は「無い」と同じ扱いにする
  if (!entry || !canViewKarte(writer, entry.studentId).allowed) throw notFound("karte.entry");
  if (entry.kind === "interview" && !canViewStaffOnlyKarte(writer, entry.studentId).allowed) throw notFound("karte.entry");
  requireDecision(canDeleteKarteEntry(writer, entry), writer, "karte.entry_delete");
  await context.store.deleteKarteEntry(entry.id);
  await recordAudit(context, writer, { action: "karte.entry_delete", targetType: "karte_entry", targetId: entry.id, metadata: { studentId: entry.studentId, kind: entry.kind } });
}

/** お手本動画の候補（コーチ・運営がフィードバックに紐づける用）。公開中の動画のタイトルだけ */
export async function listModelVideoOptions(context: ServiceContext, actor: Actor | null): Promise<{ id: string; title: string }[]> {
  const viewer = requireActor(actor);
  if (viewer.role !== "coach" && viewer.role !== "admin") return [];
  const page = await context.store.listVideos({ page: 1, pageSize: 300, publishedOnly: true });
  return page.items.map((video) => ({ id: video.id, title: video.title }));
}
