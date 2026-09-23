import type {
  ChatMessage,
  DiagnosisChoice,
  DiagnosisQuestion,
  PrivateProfile,
  PublicProfile,
  QuizChoice,
  QuizQuestion,
  SoccerNote,
  Video,
  VideoReview,
} from "./types";

/**
 * クライアントへ渡す形（DTO）。
 *
 * 型の Omit だけでは実行時にフィールドが残る（`{ ...video }` を返せば playbackId ごと漏れる）。
 * そこで「型で落とす」と「関数で実際に落とす」を必ずセットにし、画面やアクションはこの関数を通した値しか返さない。
 * 関数はスプレッドや「秘密だけ捨てる」分割代入を使わず、渡してよいキーを1つずつ書いて組み立てる。
 * 元の型に秘密フィールドが増えても、ここに書かない限りクライアントへは出ない（許可リスト方式）。
 */

// ---------------------------------------------------------------------------
// 動画
// ---------------------------------------------------------------------------

/** 配信元の秘密ID（playbackId / storageKey）を落とした形。再生トークンは POST のレスポンスでだけ渡す */
export type VideoSummary = Omit<Video, "muxPlaybackId" | "storageKey" | "createdBy"> & {
  /** 画面で「アプリの外でも見られます」を出すためのフラグ。youtubeId から導く */
  viewableOutsideApp: boolean;
};

export function toVideoSummary(video: Video): VideoSummary {
  return {
    id: video.id,
    title: video.title,
    description: video.description,
    category: video.category,
    durationSeconds: video.durationSeconds,
    source: video.source,
    // YouTube の ID だけは渡す。守れない ID を隠しても守ったことにならないため（types.ts の Video.youtubeId 参照）
    youtubeId: video.source === "youtube" ? video.youtubeId : null,
    publishedAt: video.publishedAt,
    viewableOutsideApp: video.source === "youtube",
  };
}

// ---------------------------------------------------------------------------
// クイズ・診断（正解を送信前に渡さない）
// ---------------------------------------------------------------------------

export type QuizChoicePublic = Omit<QuizChoice, "isCorrect">;
export type QuizQuestionPublic = Omit<QuizQuestion, "choices" | "explanation"> & { choices: QuizChoicePublic[] };

export function toQuizQuestionPublic(question: QuizQuestion): QuizQuestionPublic {
  return {
    id: question.id,
    lectureId: question.lectureId,
    prompt: question.prompt,
    choices: question.choices.map((choice) => ({ id: choice.id, label: choice.label })),
  };
}

export type DiagnosisChoicePublic = Omit<DiagnosisChoice, "isCorrect">;
export type DiagnosisQuestionPublic = Omit<DiagnosisQuestion, "choices"> & { choices: DiagnosisChoicePublic[] };

export function toDiagnosisQuestionPublic(question: DiagnosisQuestion): DiagnosisQuestionPublic {
  return {
    id: question.id,
    diagnosisId: question.diagnosisId,
    categoryCode: question.categoryCode,
    prompt: question.prompt,
    sortOrder: question.sortOrder,
    choices: question.choices.map((choice) => ({ id: choice.id, label: choice.label })),
  };
}

// ---------------------------------------------------------------------------
// プロフィール
// ---------------------------------------------------------------------------

/** 他人に見せてよい形。本名・メールは PublicProfile にそもそも無いので、そのまま詰め直すだけ */
export function toPublicProfile(profile: PublicProfile): PublicProfile {
  return {
    userId: profile.userId,
    displayName: profile.displayName,
    avatarKey: profile.avatarKey,
    ageBand: profile.ageBand,
    role: profile.role,
  };
}

/** 本人・紐づいた保護者・運営向け。deletedAt は画面に要らないので落とす */
export type PrivateProfileView = Omit<PrivateProfile, "deletedAt">;

// ---------------------------------------------------------------------------
// 提出物（写真・動画のストレージキーを落とす）
// ---------------------------------------------------------------------------

/** 写真は署名URLを別の POST で受け取る。ストレージ上のパスは画面に出さない */
export type SoccerNoteView = Omit<SoccerNote, "photoStorageKey">;

export function toSoccerNoteView(note: SoccerNote): SoccerNoteView {
  return {
    id: note.id,
    studentId: note.studentId,
    studentComment: note.studentComment,
    coachId: note.coachId,
    coachReply: note.coachReply,
    submittedAt: note.submittedAt,
    repliedAt: note.repliedAt,
  };
}

export type VideoReviewView = Omit<VideoReview, "storageKey">;

export function toVideoReviewView(review: VideoReview): VideoReviewView {
  return {
    id: review.id,
    studentId: review.studentId,
    studentComment: review.studentComment,
    coachId: review.coachId,
    coachReply: review.coachReply,
    submittedAt: review.submittedAt,
    repliedAt: review.repliedAt,
  };
}

// ---------------------------------------------------------------------------
// チャット
// ---------------------------------------------------------------------------

/**
 * 削除・非表示のメッセージは本文を空にして渡す。行は残す（会話の流れが分かるように）が、中身は見せない。
 * 運営の監査画面だけは元の本文を見る（別経路）。
 */
export type ChatMessageView = Omit<ChatMessage, "hiddenAt" | "deletedAt"> & {
  state: "visible" | "deleted" | "hidden";
};

export function toChatMessageView(message: ChatMessage): ChatMessageView {
  const state = message.hiddenAt ? "hidden" : message.deletedAt ? "deleted" : "visible";
  return {
    id: message.id,
    roomId: message.roomId,
    authorId: message.authorId,
    body: state === "visible" ? message.body : "",
    createdAt: message.createdAt,
    editedAt: message.editedAt,
    state,
  };
}
