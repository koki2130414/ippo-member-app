import "server-only";
import { isDemoMode } from "./env";

/**
 * 見学モード（一時的）。
 *
 * デモモードのときだけ、「見学する」を押した人を共用の見学用アカウント（生徒・ライトプラン）として扱う。
 * クッキーには「見学中」という印だけを入れ、署名はしない。見学用アカウントは誰でもボタン1つで入れるので、
 * 印を偽造されても、ボタンを押したのと同じことしか起きない。
 *
 * 注意: この入口がある間は、サイトの URL を知っている人なら誰でもクラス動画を見られる。
 * 本番のログイン（申し込み → 承認 → パスワード）ができたら、この仕組みごと消す（README の「見学モード」参照）。
 */
export const GUEST_COOKIE_NAME = "ippo_guest";

export function isGuestModeAvailable(): boolean {
  return isDemoMode();
}
