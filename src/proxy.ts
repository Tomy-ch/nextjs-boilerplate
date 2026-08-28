import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { readOptimisticSession } from "@/adapters/server/auth/optimistic-session";
import { SESSION_COOKIE_NAME } from "@/adapters/server/auth/session-cookie";
import { allowedRolesFor } from "@/model/authz";
import { toSafeReturnUrl } from "@/model/return-url";
import { hasAllowedRole } from "@/model/session";

/** 認証をやり直させる先。 */
const LOGIN_PATH = "/login";

/**
 * 資格情報を載せた要求への応答に付ける `Cache-Control`。
 *
 * @remarks
 * 主体に紐づく応答が CDN やプロキシの共有キャッシュへ載り、別の主体へ配られる事故を、応答
 * ヘッダで止めます（[0112](../docs/adr/0112-data-classification-cache-boundary.md) 段 5）。
 * 前の段はどれもアプリの内側しか見ておらず、ここは応答ヘッダでしか止まりません。
 *
 * **画面や handler ごとに書かせません。** session cookie を載せた要求は、その応答が何であれ
 * 主体に紐づきます。要求の側で判定するので、宣言を持たない Route Handler にも届きます。
 */
const PRIVATE_CACHE_CONTROL = "private, no-store";

/**
 * 役割が足りないときに送る先。
 *
 * @remarks
 * ログインへは送りません。認証はすでに済んでおり、やり直しても同じ結果になります。403 の面を
 * 出さない理由は `docs/spec/route/admin/layout.function.md`「入れない主体をどこへ送るか」。
 */
const FALLBACK_PATH = "/";

/**
 * 入口の楽観的な認可。到達してよい役割を持たないリクエストを前捌きする。
 *
 * @remarks
 * **ここは防御線ではありません。** cookie を読むだけの前捌きであり、確定認可はデータ源に最も
 * 近い所（`adapters/server` の `verifySession()`）が持ちます
 * （[0043](../docs/adr/0043-middleware-policy.md) / [0079](../docs/adr/0079-auth-frontend-seam.md)）。
 * ここを唯一の検査にすると、Proxy を通らない経路がそのまま穴になります。
 *
 * prefetch を含む全リクエストで走るため、データ源を参照しません。cookie の復号だけに留めるのは
 * 費用の問題であると同時に、Proxy が CDN へ配置され得るという配置上の制約でもあります。
 *
 * **どの経路に何の役割が要るかは持ちません。** 宣言は `model/authz` にあり、確定認可の側も同じ
 * 宣言を引きます。ここに書き写すと、前捌きと確定認可が別々の条件で判定するようになります。
 *
 * 未認証と役割不足を分けます。前者はやり直せるのでログインへ戻し、後者はやり直しても同じ結果に
 * なるため戻しません。
 *
 * 認可とは別に、資格情報を載せた要求への応答へ `Cache-Control` を付けます（{@link PRIVATE_CACHE_CONTROL}）。
 * 要求の内容に依るヘッダはここにしか置けず、要求に依らないヘッダは `next.config.ts` が持ちます。
 */
export async function proxy(request: NextRequest): Promise<Response> {
  const response = await authorize(request);

  if (request.cookies.has(SESSION_COOKIE_NAME)) {
    response.headers.set("Cache-Control", PRIVATE_CACHE_CONTROL);
  }

  return response;
}

/** 到達してよい役割を持たない要求を送り返し、それ以外を通す。 */
async function authorize(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const allowed = allowedRolesFor(url.pathname);

  if (allowed === null) {
    return NextResponse.next();
  }

  const sealed = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await readOptimisticSession(sealed);

  if (session === null) {
    const login = new URL(LOGIN_PATH, url);
    login.searchParams.set("returnUrl", toSafeReturnUrl(`${url.pathname}${url.search}`));

    return NextResponse.redirect(login);
  }

  if (!hasAllowedRole(session, allowed)) {
    return NextResponse.redirect(new URL(FALLBACK_PATH, url));
  }

  return NextResponse.next();
}

/**
 * Proxy を走らせる対象。
 *
 * @remarks
 * 静的アセットと画像最適化の経路を外します。認証の判断が要らないうえリクエスト数が最も多く、
 * ここへ処理を挟むと配信そのものが遅くなります。
 *
 * `/api` は外しません。Route Handler も保護の対象になり得るためです。
 */
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
