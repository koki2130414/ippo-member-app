import { NextResponse, type NextRequest } from "next/server";
import { getServiceContext } from "@/server/current-actor";
import { GUEST_COOKIE_NAME, GUEST_LINK_COOKIE_MAX_AGE_SECONDS } from "@/server/guest";
import { isActiveGuestToken } from "@/server/services/guest-link-service";

/**
 * 見学リンク /guest/<トークン>。今も有効なリンクなら、見学中の印（トークン）をクッキーに入れて会員のホームへ。
 * 使えないリンクなら、理由を出すためにログイン画面へ（トークンは URL に残さない）。
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!(await isActiveGuestToken(getServiceContext(), token))) {
    const response = NextResponse.redirect(new URL("/login?guest=invalid", request.url));
    response.cookies.delete(GUEST_COOKIE_NAME);
    return response;
  }
  const response = NextResponse.redirect(new URL("/home", request.url));
  response.cookies.set(GUEST_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: GUEST_LINK_COOKIE_MAX_AGE_SECONDS,
  });
  // リンクのトークンを、移動先の Referer などに残さない
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
