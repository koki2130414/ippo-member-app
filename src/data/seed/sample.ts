import type { PointTransaction, PublicProfile, PrivateProfile } from "@/domain/types";
import type { MockState } from "../mock/mock-state";
import { SEED_CREATED_AT } from "./base-content";
import { createEmptySeed } from "./empty";
import { DEMO_IDS } from "./ids";
import { SAMPLE_EXTRA_VIDEOS, SAMPLE_LECTURES, SAMPLE_QUIZ_QUESTIONS } from "./sample-learning";

/**
 * 画面確認用の架空データ（IPPO_SEED=sample のときだけ使う）。
 *
 * 人物はすべて架空で、名前に「架空」「サンプル」を入れて、実在の人と取り違えようがないようにする（仕様 12章）。
 * 値はすべて固定。毎回同じ状態から始められることが、自動操作の再現性の前提になる（仕様 10.7）。
 */

type Person = { publicProfile: PublicProfile; privateProfile: PrivateProfile };

function person(userId: string, role: PublicProfile["role"], displayName: string, fullName: string, ageBand: PublicProfile["ageBand"], avatarKey: string): Person {
  return {
    publicProfile: { userId, displayName, avatarKey, ageBand, role },
    privateProfile: { userId, fullName, email: `${userId}@example.invalid`, createdAt: SEED_CREATED_AT, deletedAt: null },
  };
}

const SAMPLE_PEOPLE: Person[] = [
  person(DEMO_IDS.coach, "coach", "ソラコーチ（サンプル）", "架空 そら", "adult", "whistle"),
  person(DEMO_IDS.coach2, "coach", "ウミコーチ（サンプル）", "架空 うみ", "adult", "whistle"),
  person(DEMO_IDS.student, "student", "ヒカル（サンプル）", "架空 ひかる", "elementary_upper", "ball"),
  person(DEMO_IDS.student2, "student", "ミナト（サンプル）", "架空 みなと", "junior_high", "boots"),
  person(DEMO_IDS.student3, "student", "ツバサ（サンプル）", "架空 つばさ", "elementary_lower", "star"),
  person(DEMO_IDS.guardian, "guardian", "ヒカルの保護者（サンプル）", "架空 ほごしゃ", "adult", "default"),
];

function pointTransaction(index: number, userId: string, reason: PointTransaction["reason"], subject: string, jstDate: string): PointTransaction {
  return {
    id: `pt-sample-${String(index).padStart(3, "0")}`,
    userId,
    amount: 1,
    reason,
    idempotencyKey: `${reason}:${userId}:${subject}`,
    jstDate,
    createdAt: `${jstDate}T03:00:00.000Z`,
    createdBy: userId,
    note: null,
  };
}

export function createSampleSeed(): MockState {
  const state = createEmptySeed();

  for (const each of SAMPLE_PEOPLE) {
    state.publicProfiles.push(each.publicProfile);
    state.privateProfiles.push(each.privateProfile);
  }

  // ヒカルの保護者は、ヒカルにだけ紐づく。ミナト・ツバサの情報は見えない（E2E で確かめる相手）
  state.parentStudentLinks.push({ guardianId: DEMO_IDS.guardian, studentId: DEMO_IDS.student, createdAt: SEED_CREATED_AT });

  // ソラコーチはヒカルとツバサ、ウミコーチはミナトを担当
  state.coachAssignments.push(
    { coachId: DEMO_IDS.coach, studentId: DEMO_IDS.student, createdAt: SEED_CREATED_AT },
    { coachId: DEMO_IDS.coach, studentId: DEMO_IDS.student3, createdAt: SEED_CREATED_AT },
    { coachId: DEMO_IDS.coach2, studentId: DEMO_IDS.student2, createdAt: SEED_CREATED_AT },
  );

  for (const classRoom of state.classRooms) {
    classRoom.coachIds = classRoom.id === "class-fitness" ? [DEMO_IDS.coach2] : [DEMO_IDS.coach];
  }
  state.classEnrollments.push(
    { classRoomId: "class-soccer-iq", studentId: DEMO_IDS.student, createdAt: SEED_CREATED_AT },
    { classRoomId: "class-mentality", studentId: DEMO_IDS.student, createdAt: SEED_CREATED_AT },
    { classRoomId: "class-fitness", studentId: DEMO_IDS.student2, createdAt: SEED_CREATED_AT },
  );

  // 3人の生徒に、判定の違いが画面で確かめられるよう別々のプランを割り当てる
  state.memberships.push(
    { userId: DEMO_IDS.student, planCode: "personal", startedAt: SEED_CREATED_AT, endedAt: null, assignedBy: DEMO_IDS.admin },
    { userId: DEMO_IDS.student2, planCode: "balance", startedAt: SEED_CREATED_AT, endedAt: null, assignedBy: DEMO_IDS.admin },
    { userId: DEMO_IDS.student3, planCode: "light", startedAt: SEED_CREATED_AT, endedAt: null, assignedBy: DEMO_IDS.admin },
  );

  state.videos.push(
    {
      id: "video-sample-upload",
      title: "ボールをもらう前に、首をふろう",
      description: "まわりを見るタイミングを、試合の場面でたしかめます。",
      category: "soccer_iq",
      durationSeconds: 420,
      source: "upload",
      // デモでは実ファイルを置かない。再生は Phase 3 のデモ用プレイヤーで代替する
      storageKey: "class-videos/sample/look-before-receive.mp4",
      muxPlaybackId: null,
      youtubeId: null,
      publishedAt: SEED_CREATED_AT,
      createdBy: DEMO_IDS.admin,
    },
    {
      id: "video-sample-mux",
      title: "ミスのあと、3秒で切りかえる",
      description: "深呼吸と合言葉で、つぎのプレーに気持ちをもどす練習。",
      category: "mentality",
      durationSeconds: 360,
      source: "mux",
      muxPlaybackId: "SampleSignedPlaybackId0001",
      storageKey: null,
      youtubeId: null,
      publishedAt: SEED_CREATED_AT,
      createdBy: DEMO_IDS.admin,
    },
    {
      id: "video-sample-youtube",
      title: "おうちでできる体幹トレーニング",
      description: "YouTube で公開している動画です。",
      category: "fitness",
      durationSeconds: 300,
      source: "youtube",
      // YouTube の開発者向けドキュメントで例として使われている動画ID（IPPO の動画ではない。画面確認用）
      youtubeId: "M7lc1UVf-VE",
      storageKey: null,
      muxPlaybackId: null,
      publishedAt: SEED_CREATED_AT,
      createdBy: DEMO_IDS.admin,
    },
  );

  state.videos.push(...structuredClone(SAMPLE_EXTRA_VIDEOS));
  state.lectures.push(...structuredClone(SAMPLE_LECTURES));
  state.quizQuestions.push(...structuredClone(SAMPLE_QUIZ_QUESTIONS));

  state.soccerNotes.push(
    {
      id: "note-sample-001",
      studentId: DEMO_IDS.student,
      photoStorageKey: `soccer-notes/${DEMO_IDS.student}/note-sample-001.jpg`,
      studentComment: "今日はパスの前にまわりを見ることを意識しました",
      coachId: DEMO_IDS.coach,
      coachReply: "首をふる回数がふえているね。つぎは受ける前に2回見てみよう",
      submittedAt: "2026-09-10T09:00:00.000Z",
      repliedAt: "2026-09-11T09:00:00.000Z",
    },
    {
      id: "note-sample-002",
      studentId: DEMO_IDS.student2,
      photoStorageKey: `soccer-notes/${DEMO_IDS.student2}/note-sample-002.jpg`,
      studentComment: "試合でシュートを2本うてました",
      coachId: null,
      coachReply: null,
      submittedAt: "2026-09-20T09:00:00.000Z",
      repliedAt: null,
    },
  );

  state.videoReviews.push({
    id: "review-sample-001",
    studentId: DEMO_IDS.student2,
    storageKey: `video-reviews/${DEMO_IDS.student2}/review-sample-001.mp4`,
    studentComment: "ドリブルのときの体のむきを見てほしいです",
    coachId: null,
    coachReply: null,
    submittedAt: "2026-09-18T09:00:00.000Z",
    repliedAt: null,
  });

  state.pointTransactions.push(
    pointTransaction(1, DEMO_IDS.student, "login_daily", "2026-09-20", "2026-09-20"),
    pointTransaction(2, DEMO_IDS.student, "login_daily", "2026-09-21", "2026-09-21"),
    pointTransaction(3, DEMO_IDS.student, "video_completed", "video-sample-upload", "2026-09-21"),
    pointTransaction(4, DEMO_IDS.student, "note_submitted", "note-sample-001", "2026-09-10"),
    pointTransaction(5, DEMO_IDS.student2, "login_daily", "2026-09-21", "2026-09-21"),
  );

  state.exchangeItems.push(
    { id: "item-sticker", name: "IPPO オリジナルステッカー", costPoints: 30, stock: 20 },
    { id: "item-message-card", name: "コーチからのメッセージカード", costPoints: 50, stock: 10 },
  );

  return state;
}
