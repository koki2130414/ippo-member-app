import type { ActivityCounts, FollowUp, ReportRange } from "./karte";
import type { KarteAction, KarteEntry, KarteEntryKind, KarteGoal, UserId } from "./types";

/** カルテの画面に渡す形（サービスが組み立て、components が表示する） */

export interface KarteGoalView extends KarteGoal {
  actions: KarteAction[];
  lastRating: number | null;
}

export interface KarteEntryView extends KarteEntry {
  modelVideoTitle: string | null;
  authorName: string;
}

export interface KarteStudentSummary {
  userId: UserId;
  displayName: string;
  planName: string | null;
}

export interface KarteView {
  student: KarteStudentSummary;
  goals: KarteGoalView[];
  entries: KarteEntryView[];
  /** 今月（JST）の積み上げ */
  thisMonth: ActivityCounts;
  monthLabel: string;
  /** 画面で出し分けるための「この人に何ができるか」（判定そのものはサービスで毎回やり直す） */
  can: { writeGoal: boolean; writeKinds: KarteEntryKind[]; seeStaffOnly: boolean };
  /** 担当コーチ・運営だけ */
  followUp: FollowUp | null;
}

export interface KarteReport {
  student: KarteStudentSummary;
  range: ReportRange;
  goals: KarteGoalView[];
  counts: ActivityCounts;
  /** 同じ長さの前の期間（比べる相手は「昨日の自分」だけ） */
  previousCounts: ActivityCounts;
  averageRating: number | null;
  feedbacks: KarteEntryView[];
  personals: KarteEntryView[];
  practices: KarteEntryView[];
  reflections: KarteEntryView[];
  completedVideoTitles: string[];
  generatedOn: string;
}

export interface KarteStudentRow extends KarteStudentSummary {
  last30: ActivityCounts;
  activeGoals: number;
  followUp: FollowUp;
}
