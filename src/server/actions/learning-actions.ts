"use server";

import { z } from "zod";
import { answersSchema } from "@/domain/schemas";
import { getCurrentActor, getServiceContext } from "../current-actor";
import { completeLecture, startLectureReading, submitQuiz } from "../services/lecture-service";
import { completeVideo, startPlayback } from "../services/video-service";
import { runAction } from "./action-result";

/**
 * 動画・講義の Server Action。どれも POST で呼ばれる。
 * 再生トークンや正解は、ここの戻り値（POST のレスポンス）にだけ載り、HTML や RSC ペイロードには載らない。
 */

const idSchema = z.string().min(1).max(64);

export async function startPlaybackAction(videoId: string) {
  return runAction("video.play", async () => startPlayback(getServiceContext(), await getCurrentActor(), idSchema.parse(videoId)));
}

export async function completeVideoAction(videoId: string, viewSessionId: string) {
  return runAction("video.complete", async () =>
    completeVideo(getServiceContext(), await getCurrentActor(), { videoId: idSchema.parse(videoId), viewSessionId: idSchema.parse(viewSessionId) }),
  );
}

export async function startLectureAction(lectureId: string) {
  return runAction("lecture.start", async () => startLectureReading(getServiceContext(), await getCurrentActor(), idSchema.parse(lectureId)));
}

export async function completeLectureAction(lectureId: string, viewSessionId: string) {
  return runAction("lecture.complete", async () =>
    completeLecture(getServiceContext(), await getCurrentActor(), { lectureId: idSchema.parse(lectureId), viewSessionId: idSchema.parse(viewSessionId) }),
  );
}

export async function submitQuizAction(lectureId: string, answers: unknown) {
  return runAction("quiz.submit", async () =>
    submitQuiz(getServiceContext(), await getCurrentActor(), { lectureId: idSchema.parse(lectureId), answers: answersSchema.parse(answers) }),
  );
}
