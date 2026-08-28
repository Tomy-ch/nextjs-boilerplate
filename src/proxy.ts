import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { readOptimisticSession } from "@/adapters/server/auth/optimistic-session";
import { SESSION_COOKIE_NAME } from "@/adapters/server/auth/session-cookie";
import { getMaintenanceConfig } from "@/config/maintenance/maintenance.server";
import { allowedRolesFor } from "@/model/authz";
import {
  allowsCategory,
  CONSENT_CATEGORY,
  CONSENT_COOKIE_NAME,
  CONSENT_MAX_AGE_SECONDS,
  MEASUREMENT_ID_COOKIE_NAME,
  newMeasurementId,
  parseConsentState,
} from "@/model/consent";
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
 * 生存確認は外形監視のため止めません（理由は `src/app/api/health/route.ts`）。
 *
 * 停止画面自身を含めます。差し替え先を差し替えの対象にすると、rewrite が自分を指します。
 */
const OPEN_PATHS: ReadonlySet<string> = new Set([MAINTENANCE_PATH, "/api/health"]);

/**
 * 止めているあいだも描いてよい method。
 *
 * @remarks
 * **差し替えは描く先を変えるだけで、要求そのものは後段へ流れます。** method も body も
 * `Next-Action` ヘッダもそのままなので、止まっていることを要求側へ言うのは差し替えの仕事では
 * ありません。ここで読み取り以外を断るのは、**止めるという約束を自分の境界で言い切るため**です。
 *
 * Next.js 側でも結局は実行されませんが、それは framework の内部の成り行きであって、こちらが
 * 約束したことではありません。**依存すると、その内部が変わった日に黙って開きます**
 * （成り行きの中身は `docs/spec/route/maintenance/page.function.md`）。
 */
const OPEN_METHODS: ReadonlySet<string> = new Set(["GET", "HEAD"]);

/**
 * 止めているあいだ、断る要求へ返す状態。
 *
 * @remarks
 * ここは差し替えではなく proxy が自分で返す応答なので、状態がそのまま配信されます
 * （rewrite に載せた status は読まれません。`docs/spec/route/maintenance/page.function.md`）。
 */
const STOPPED_STATUS = 503;

/**
 * 役割が足りないときに送る先。
 *
 * @remarks
 * ログインへは送りません。認証はすでに済んでおり、やり直しても同じ結果になります。403 の面を
 * 出さない理由は `docs/spec/route/admin/layout.function.md`「入れない主体をどこへ送るか」。
 */
const FALLBACK_PATH = "/";

/**
 * 入口の前捌き。配信を止めているあいだは読み取りを停止画面へ差し替えてそれ以外を断り、そうで
 * なければ到達してよい役割を持たないリクエストを捌く。
 *
 * @remarks
 * **停止の判定を先に置きます。** 止めているあいだに認可を先に見ると、未認証の要求だけがログイン
 * へ送られ、止まっていることが経路によって見えたり見えなかったりします。止めるのは全ルートに
 * 対する一つの判断なので、経路ごとの判定より前に済ませます。差し替えるのは応答の中身だけで、
 * URL は動かしません —— 復帰後に同じ URL をもう一度開けば元の画面へ戻ります。
 *
 * **読み取りの応答は 200 です**（{@link STOPPED_STATUS}）。画面へ 503 を返したい配備では、配信面
 * （CDN / ロードバランサ）が前に立ちます。
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
 *
 * 認可とは別に、同意に紐づく計測 id の発行と撤去をここが持ちます（{@link syncMeasurementId}）。
 * cookie を書くのはこの境界の仕事であり（[0043](../docs/adr/0043-middleware-policy.md)）、画面の
 * どれか一つに置くと、その画面を通らない訪問で発行されません。
 */
export async function proxy(request: NextRequest): Promise<Response> {
  const url = new URL(request.url);

  if (getMaintenanceConfig().isStopped && !OPEN_PATHS.has(url.pathname)) {
    return OPEN_METHODS.has(request.method)
      ? NextResponse.rewrite(new URL(MAINTENANCE_PATH, url))
      : new NextResponse(null, { status: STOPPED_STATUS });
  }

  const response = await authorize(request, url);

  syncMeasurementId(request, response, url);

  return response;
}

/**
 * 同意に紐づく計測 id を、いまの同意状態へ合わせる。
 *
 * @remarks
 * **発行するのは同意が得られている間だけです。** 未同意のうちに配ると、識別子を渡してから
 * 同意を尋ねることになり、ゲートの意味が消えます（[0131](../docs/adr/0131-cookie-consent.md)）。
 *
 * **同意が外れたら消します。** 期限切れも、cookie を消した利用者も、選び直した利用者も同じ
 * 扱いです。id だけが残ると、同意していない主体を前の識別子で繋げてしまいます。
 *
 * **すでに配ってあれば作り直しません。** 要求のたびに新しくすると、同じブラウザからの訪問を
 * 繋ぐという id の役目そのものが果たせません。
 *
 * `httpOnly` を付けません。読むのはブラウザ側で動く計測であり、サーバは配るだけだからです。
 * ゲートの先に何も繋いでいない状態では読み手が居ませんが、読めない形で配ると、繋いだ時点で
 * 発行の口ごと作り直すことになります。
 */
function syncMeasurementId(request: NextRequest, response: NextResponse, url: URL): void {
  const consent = parseConsentState(request.cookies.get(CONSENT_COOKIE_NAME)?.value);
  const issued = request.cookies.has(MEASUREMENT_ID_COOKIE_NAME);

  if (!allowsCategory(consent, CONSENT_CATEGORY.optional)) {
    if (issued) {
      response.cookies.delete(MEASUREMENT_ID_COOKIE_NAME);
    }

    return;
  }

  if (issued) {
    return;
  }

  response.cookies.set(MEASUREMENT_ID_COOKIE_NAME, newMeasurementId(), {
    httpOnly: false,
    maxAge: CONSENT_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: url.protocol === "https:",
  });
}

/** 到達してよい役割を持たない要求を送り返し、それ以外を通す。 */
async function authorize(request: NextRequest, url: URL): Promise<NextResponse> {
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
