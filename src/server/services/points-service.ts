import { canGrantPoints } from "@/domain/authorization";
import { toJstDate } from "@/domain/jst";
import { buildIdempotencyKey, decideAward, findPointRule, sumBalance } from "@/domain/points";
import type { Actor, PointRuleCode, PointTransaction, UserId } from "@/domain/types";
import type { ServiceContext } from "./context";
import { recordAudit } from "./audit";
import { conflict, invalid, notFound } from "./errors";
import { requireActor, requireDecision, requireRole, requireStudentAccess } from "./guards";

/**
 * ポイントのサービス層。
 * 残高は取引履歴から毎回計算する。付与は appendPointTransaction（冪等キーと日次上限を書き込みと同時に確認）でだけ行う。
 */

export type AwardOutcome =
  | { kind: "awarded"; amount: number }
  | { kind: "already_awarded" }
  | { kind: "daily_limit_reached"; message: string };

/**
 * 生徒自身の行動に対する付与（ログイン、動画を見終わった、など）。
 * 呼び出し側のサービスが「行動が本当に成立したか」を確かめてから呼ぶ。ここを Server Action から直接呼ばせない。
 */
export async function awardForOwnAction(
  context: ServiceContext,
  actor: Actor | null,
  input: { ruleCode: PointRuleCode; subject: string },
): Promise<AwardOutcome> {
  const student = requireRole(actor, ["student"], "points.award_own");
  const rules = await context.store.listPointRules();
  const rule = findPointRule(rules, input.ruleCode);
  if (!rule || rule.grantedBy !== "system") throw invalid("このポイントはここでは受け取れません", `rule:${input.ruleCode}`);

  const now = context.now();
  const idempotencyKey = buildIdempotencyKey(rule.code, student.userId, input.subject);
  // 事前判定（金額の妥当性など）。重複と日次上限の最終判定は、書き込みと同時に store が行う
  const decision = decideAward({ rule, requestedAmount: null, idempotencyKey, alreadyAwardedWithSameKey: false, awardedTodayForRule: 0, now });
  if (decision.kind !== "award") throw invalid("ポイントをつけられませんでした", `decision:${decision.kind}`);

  const result = await context.store.appendPointTransaction(
    {
      id: context.newId(),
      userId: student.userId,
      amount: decision.amount,
      reason: rule.code,
      idempotencyKey,
      jstDate: decision.jstDate,
      createdAt: now.toISOString(),
      createdBy: student.userId,
      note: null,
    },
    rule.maxPerDay,
  );
  switch (result.outcome) {
    case "inserted":
      return { kind: "awarded", amount: decision.amount };
    case "duplicate_key":
      return { kind: "already_awarded" };
    case "daily_limit_reached":
      return { kind: "daily_limit_reached", message: `「${rule.label}」のポイントは今日はここまで。また明日ためよう` };
  }
}

/** コーチ加点・イベント参加・運営調整など、人が付与するもの */
export async function grantPoints(
  context: ServiceContext,
  actor: Actor | null,
  input: { studentId: UserId; ruleCode: PointRuleCode; amount: number; requestId: string; note?: string | undefined },
): Promise<AwardOutcome> {
  const granter = requireActor(actor);
  const rules = await context.store.listPointRules();
  const rule = findPointRule(rules, input.ruleCode);
  if (!rule) throw notFound(`rule:${input.ruleCode}`);
  requireDecision(canGrantPoints(granter, rule, input.studentId), granter, "points.grant");

  const student = await context.store.getPublicProfile(input.studentId);
  if (!student || student.role !== "student") throw notFound("points.grant:student");

  const now = context.now();
  // requestId はフォームを開いたときに作られる。同じフォームの二重送信は同じキーになるので、二重に付かない
  const idempotencyKey = buildIdempotencyKey(rule.code, input.studentId, `grant-${input.requestId}`);
  const decision = decideAward({ rule, requestedAmount: input.amount, idempotencyKey, alreadyAwardedWithSameKey: false, awardedTodayForRule: 0, now });
  if (decision.kind === "invalid_amount") throw invalid("ポイントは1〜100の整数で入力してください");
  if (decision.kind !== "award") throw invalid("ポイントをつけられませんでした", `decision:${decision.kind}`);

  const result = await context.store.appendPointTransaction(
    {
      id: context.newId(),
      userId: input.studentId,
      amount: decision.amount,
      reason: rule.code,
      idempotencyKey,
      jstDate: decision.jstDate,
      createdAt: now.toISOString(),
      createdBy: granter.userId,
      // メモは生徒に見せる前提で、コーチが書く。監査ログには入れない
      note: input.note?.trim() ? input.note.trim() : null,
    },
    rule.maxPerDay,
  );
  if (result.outcome === "duplicate_key") return { kind: "already_awarded" };
  if (result.outcome === "daily_limit_reached") {
    return { kind: "daily_limit_reached", message: `「${rule.label}」は今日の上限に達しています。明日もう一度つけてください` };
  }
  await recordAudit(context, granter, {
    action: "points.adjust",
    targetType: "student",
    targetId: input.studentId,
    metadata: { ruleCode: rule.code, amount: decision.amount, transactionId: result.transaction.id },
  });
  return { kind: "awarded", amount: decision.amount };
}

export interface PointSummary {
  balance: number;
  /** 新しい順。画面には直近のものだけを出す */
  recent: Pick<PointTransaction, "id" | "amount" | "reason" | "jstDate" | "note">[];
}

export async function getPointSummary(context: ServiceContext, actor: Actor | null, studentId: UserId): Promise<PointSummary> {
  requireStudentAccess(actor, studentId, "points.view");
  const transactions = await context.store.listPointTransactions(studentId);
  const recent = [...transactions]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 20)
    .map(({ id, amount, reason, jstDate, note }) => ({ id, amount, reason, jstDate, note }));
  return { balance: sumBalance(transactions), recent };
}

export type ExchangeOutcome = { kind: "exchanged"; itemName: string; cost: number } | { kind: "already_exchanged" };

/** 交換。残高と在庫の確認と引き落としは store の1回の操作で行う（仕様 8章） */
export async function exchangePoints(context: ServiceContext, actor: Actor | null, input: { itemId: string; requestId: string }): Promise<ExchangeOutcome> {
  const student = requireRole(actor, ["student"], "points.exchange");
  const item = await context.store.getExchangeItem(input.itemId);
  if (!item) throw notFound("points.exchange:item");
  const now = context.now();
  const result = await context.store.exchangePoints({
    itemId: input.itemId,
    debit: {
      id: context.newId(),
      userId: student.userId,
      reason: "exchange",
      idempotencyKey: `exchange:${student.userId}:${input.requestId}`,
      jstDate: toJstDate(now),
      createdAt: now.toISOString(),
      createdBy: student.userId,
      note: item.name,
    },
  });
  switch (result.outcome) {
    case "exchanged":
      await recordAudit(context, student, {
        action: "points.exchange",
        targetType: "exchange_item",
        targetId: item.id,
        metadata: { cost: -result.transaction.amount, transactionId: result.transaction.id },
      });
      return { kind: "exchanged", itemName: item.name, cost: -result.transaction.amount };
    case "duplicate_key":
      return { kind: "already_exchanged" };
    case "item_not_found":
      throw notFound("points.exchange:item");
    case "out_of_stock":
      throw conflict(`「${item.name}」は今は在庫がありません。ほかのものをえらぶか、また今度のぞいてみてね`);
    case "insufficient_points":
      throw conflict(`あと${result.shortBy}ポイントで交換できます。動画や講義でポイントをためてみよう`);
  }
}

