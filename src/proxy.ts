import { NextResponse, type NextRequest } from "next/server";
import { rolesAllowedForPath } from "@/domain/authorization";

/**
 * ルート単位の入口（認可の1層目）。
 *
 * ここではクッキーが「あるかどうか」だけを見て、無ければ /login へ送る。
 * 署名の検証やロールの判定はしない。proxy は画面の描画とは別の場所で動くことがあり、
 * 共有のモジュールやメモリに頼ってはいけない（Next.js のドキュメント）ため、
 * 本当の判定は画面側の requirePageActor とサービス層で行う。
 */
const SESSION_COOKIE_NAME = "ippo_session";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (rolesAllowedForPath(pathname) === "public") return NextResponse.next();
  if (request.cookies.has(SESSION_COOKIE_NAME)) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // 静的ファイルと画像は通す（ここで止めると CSS や JS が読めなくなる）
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|txt)$).*)"],
};
