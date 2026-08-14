import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { readOptimisticSession } from "@/adapters/server/auth/optimistic-session";
import { SESSION_COOKIE_NAME } from "@/adapters/server/auth/session-cookie";
import { toSafeReturnUrl } from "@/model/return-url";

/**
 * 認証を要求するパスの接頭辞。
 *
 * @remarks
 * 保護されている側を列挙します。公開側を列挙する書き方だと、新しく足した画面が既定で公開になり、
 * 書き忘れがそのまま漏洩になります。
 *
 * `/account` は fork 先が最初に書き換える置き場です。同梱サンプルの画面は破棄と一緒に消えますが、
 * 保護の宣言そのものは残す必要があるため、1 つだけ中立な接頭辞を置いています。
 */
const PROTECTED_PREFIXES = [
  "/account",
  "/mypage", // sample:line
  "/checkout", // sample:line
  "/admin", // sample:line
];

/** 認証をやり直させる先。 */
const LOGIN_PATH = "/login";

/**
 * 入口の楽観的な認可。未認証らしきリクエストをログインへ前捌きする。
 *
 * @remarks
 * **ここは防御線ではありません。** cookie を読むだけの前捌きであり、確定認可はデータ源に最も
 * 近い所（`adapters/server` の `verifySession()`）が持ちます
 * （[0043](../docs/adr/0043-middleware-policy.md) / [0079](../docs/adr/0079-auth-frontend-seam.md)）。
 * ここを唯一の検査にすると、Proxy を通らない経路がそのまま穴になります。
 *
 * prefetch を含む全リクエストで走るため、データ源を参照しません。cookie の復号だけに留めるのは
 * 費用の問題であると同時に、Proxy が CDN へ配置され得るという配置上の制約でもあります。
 */
export async function proxy(request: NextRequest): Promise<Response> {
  const url = new URL(request.url);

  if (!PROTECTED_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  const sealed = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if ((await readOptimisticSession(sealed)) !== null) {
    return NextResponse.next();
  }

  const login = new URL(LOGIN_PATH, url);
  login.searchParams.set("returnUrl", toSafeReturnUrl(`${url.pathname}${url.search}`));

  return NextResponse.redirect(login);
}

/**
 * Proxy を走らせる対象。
 *
 * @remarks
 * 静的アセットと画像最適化の経路を外します。認証の判断が要らないうえリクエスト数が最も多く、
 * ここへ処理を挟むと配信そのものが遅くなります。
 *
 * `/api` は外しません。Route Handler も保護の対象になり得るためです。ただし Route Handler 側は
 * 確定認可を自分で通すので、ここでの判定は前捌きに留まります。
 */
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
