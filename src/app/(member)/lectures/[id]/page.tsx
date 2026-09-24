import type { Metadata } from "next";
import Link from "next/link";
import { EntitlementNotice } from "@/components/entitlement-notice";
import { LectureProgress } from "@/components/lecture-progress";
import { QuizForm } from "@/components/quiz-form";
import { describeEntitlement } from "@/domain/plans";
import { getServiceContext } from "@/server/current-actor";
import { loadForPage } from "@/server/page-errors";
import { requirePageActor } from "@/server/page-guards";
import { getLectureDetail } from "@/server/services/lecture-service";

export const metadata: Metadata = { title: "講義" };

export default async function LectureDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requirePageActor(["student", "guardian"], `/lectures/${id}`);
  // 設問は QuizQuestionPublic（正解フラグなし）。採点はクイズを送ったときにサーバーで行う
  const detail = await loadForPage(() => getLectureDetail(getServiceContext(), actor, id));
  const hasAccess = detail.access.status === "available";

  return (
    <main data-page="lecture-detail" data-state="ready" className="mx-auto max-w-3xl space-y-5 px-4 py-6">
      <Link href={`/lectures?tab=${detail.lecture.categoryId}`} className="text-sm font-semibold text-primary" data-testid="lecture-back">← {detail.categoryName ?? "講義"}</Link>
      <h1 className="text-2xl font-bold">{detail.lecture.title}</h1>

      {!hasAccess ? (
        <EntitlementNotice message={describeEntitlement(detail.access)} testId="lecture-entitlement" />
      ) : (
        <>
          <article className="space-y-4 leading-relaxed" data-testid="lecture-body">
            {detail.lecture.body.split("\n\n").map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </article>

          {detail.video ? (
            <p className="text-sm">
              関連する動画：
              <Link href={`/videos/${detail.video.id}`} className="font-semibold text-primary underline" data-testid="lecture-related-video">{detail.video.title}</Link>
            </p>
          ) : null}

          {detail.canEarnPoints ? <LectureProgress lectureId={detail.lecture.id} minimumReadSeconds={detail.minimumReadSeconds} initiallyCompleted={detail.completed} /> : null}

          <QuizForm lectureId={detail.lecture.id} questions={detail.questions} canSubmit={detail.canEarnPoints} initiallyPassed={detail.quizPassed} />
        </>
      )}
    </main>
  );
}
