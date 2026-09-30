import type { MockState } from "../mock/mock-state";
import { BASE_CLASS_ROOMS, BASE_DIAGNOSIS, BASE_VIDEOS, BASE_DIAGNOSIS_QUESTIONS, BASE_LECTURE_CATEGORIES, BASE_PLANS, BASE_POINT_RULES, SEED_CREATED_AT } from "./base-content";
import { DEMO_IDS } from "./ids";

/**
 * 既定の seed。運営アカウント1つと、人物以外の定義だけ。架空の子どもは1人も入れない。
 * 環境変数を書き忘れても、架空の子どもが本番の画面に出ることを構造的に防ぐため（仕様 12章）。
 */
export function createEmptySeed(): MockState {
  return {
    publicProfiles: [
      { userId: DEMO_IDS.admin, displayName: "運営", avatarKey: "default", ageBand: "adult", role: "admin" },
      // 見学モードの入口（一時的）。子どもの人物データではなく、動画を見るための共用アカウント
      { userId: DEMO_IDS.guest, displayName: "見学用", avatarKey: "default", ageBand: null, role: "student" },
    ],
    privateProfiles: [
      { userId: DEMO_IDS.admin, fullName: "運営アカウント", email: "admin@example.invalid", grade: null, prefecture: null, createdAt: SEED_CREATED_AT, deletedAt: null },
      { userId: DEMO_IDS.guest, fullName: "見学用アカウント", email: "guest@example.invalid", grade: null, prefecture: null, createdAt: SEED_CREATED_AT, deletedAt: null },
    ],
    parentStudentLinks: [],
    coachAssignments: [],
    classEnrollments: [],
    plans: structuredClone(BASE_PLANS),
    // 見学用はライトプラン（クラス動画・講義・診断だけが見られる）
    memberships: [{ userId: DEMO_IDS.guest, planCode: "light", startedAt: SEED_CREATED_AT, endedAt: null, assignedBy: DEMO_IDS.admin }],
    pointRules: structuredClone(BASE_POINT_RULES),
    pointTransactions: [],
    exchangeItems: [],
    auditLogs: [],
    applications: [],
    invitations: [],
    guestLinks: [],
    credentials: [],
    sessions: [],
    videos: structuredClone(BASE_VIDEOS),
    classRooms: structuredClone(BASE_CLASS_ROOMS),
    lectureCategories: structuredClone(BASE_LECTURE_CATEGORIES),
    lectures: [],
    quizQuestions: [],
    lectureProgress: [],
    videoProgress: [],
    viewSessions: [],
    diagnoses: [structuredClone(BASE_DIAGNOSIS)],
    diagnosisQuestions: structuredClone(BASE_DIAGNOSIS_QUESTIONS),
    soccerNotes: [],
    videoReviews: [],
  };
}
