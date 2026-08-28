import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { readOptimisticSession } from "@/adapters/server/auth/optimistic-session";
import { SESSION_COOKIE_NAME } from "@/adapters/server/auth/session-cookie";
import { getMaintenanceConfig } from "@/config/maintenance/maintenance.server";
import { allowedRolesFor } from "@/model/authz";
import { toSafeReturnUrl } from "@/model/return-url";
import { hasAllowedRole } from "@/model/session";

/** 認証をやり直させる先。 */
const LOGIN_PATH = "/login";

/** 停止中に見せる画面。 */
const MAINTENANCE_PATH = "/maintenance";

/**
 * 停止中も通す経路。
 *
 * @remarks
 * 停止中の画面自身が資材を取りに行けなくなるため、静的アセットを止めません。ただしそれは
 * {@link config} の選別が既に外しているので、ここに並ぶのは選別を通ってくる経路だけです。
 *
 * 生存確認を止めないのは、外形監視が**計画停止と障害を区別できなくなる**ためです。全経路が
 * 停止画面を返すと、監視から見えるのは「応答が変わった」ことだけになります。
 *
 * 停止画面自身を含めます。差し替え先を差し替えの対象にすると、rewrite が自分を指します。
 */
const OPEN_PATHS: readonly string[] = [MAINTENANCE_PATH, "/api/health"];

/**
 * 役割が足りないときに送る先。
 *
 * @remarks
 * ログインへは送りません。認証はすでに済んでおり、やり直しても同じ結果になります。403 の面を
 * 出さない理由は `docs/spec/route/admin/layout.function.md`「入れない主体をどこへ送るか」。
 */
const FALLBACK_PATH = "/";

/**
 * 入口の前捌き。配信を止めているあいだは停止画面へ差し替え、そうでなければ到達してよい役割を
 * 持たないリクエストを捌く。
 *
 * @remarks
 * **停止の判定を先に置きます。** 止めているあいだに認可を先に見ると、未認証の要求だけがログイン
 * へ送られ、止まっていることが経路によって見えたり見えなかったりします。止めるのは全ルートに
 * 対する一つの判断なので、経路ごとの判定より前に済ませます。差し替えるのは応答の中身だけで、
 * URL は動かしません —— 復帰後に同じ URL をもう一度開けば元の画面へ戻ります。
 *
 * **停止中も状態は 200 です。** rewrite に載せた status は Next.js が読まず、応答は差し替え先を
 * 描いた結果になります（`resolve-routes.js` は `x-middleware-rewrite` から宛先を取り、status は
 * `location` を redirect と見なすかの判定にしか使いません）。503 を返したい配備では、配信面
 * （CDN / ロードバランサ）が前に立ちます（`docs/spec/route/maintenance/page.function.md`）。
 *
 * 認可について、**ここは防御線ではありません。** cookie を読むだけの前捌きであり、確定認可は
 * データ源に最も近い所（`adapters/server` の `verifySession()`）が持ちます
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
 */
export async function proxy(request: NextRequest): Promise<Response> {
  const url = new URL(request.url);

  if (getMaintenanceConfig().isStopped && !OPEN_PATHS.includes(url.pathname)) {
    return NextResponse.rewrite(new URL(MAINTENANCE_PATH, url));
  }

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
