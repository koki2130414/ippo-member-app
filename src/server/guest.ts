import "server-only";
import { isDemoMode } from "./env";

/**
 * 見学（ログインなしで会員画面を見る）の入口は2つ。どちらも共用の「見学用」アカウント（生徒・ライトプラン）として扱い、
 * 「見おわった」・ポイント・クイズの記録はしない。
 *
 * 1. 見学リンク（本番でも使える）: 運営が管理画面で発行する /guest/<トークン>。開くとクッキーにトークンを入れ、
 *    画面を開くたびに「今も有効なリンクか」をデータベースで確かめる。運営がリンクを作り直すか止めると、その場で入れなくなる。
 *    サイトのURLだけでは入れない（server/services/guest-link-service.ts）
 * 2. 「見学する」ボタン（デモモードだけ）: クッキーに "1" を入れる。デモのデータは架空なので、署名はしない
 */
export const GUEST_COOKIE_NAME = "ippo_guest";
export const DEMO_GUEST_COOKIE_VALUE = "1";
/** 見学リンクから入ったときのクッキーの有効期限。リンクを止めれば期限前でも入れなくなる */
export const GUEST_LINK_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export function isGuestModeAvailable(): boolean {
  return isDemoMode();
}
