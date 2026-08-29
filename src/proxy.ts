import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { readOptimisticSession } from "@/adapters/server/auth/optimistic-session";
import { SESSION_COOKIE_NAME } from "@/adapters/server/auth/session-cookie";
import { getHttpConfig } from "@/config/http/http.server";
import { getMaintenanceConfig } from "@/config/maintenance/maintenance.server";
import { allowedRolesFor } from "@/model/authz";
import {
  corsHeadersFor,
  isStateChanging,
  judgeOrigin,
  preflightHeadersFor,
} from "@/model/cross-origin";
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

/** 別 origin への CORS を開く経路の接頭辞。開くのは BFF だけ（[0111](../docs/adr/0111-csp-security-headers.md) §5）。 */
const BFF_PREFIX = "/api/";

/**
 * 資格情報を載せた要求への応答に付ける `Cache-Control`。画面や handler ごとには書かない
 * （`docs/rules.md` #87 / [0112](../docs/adr/0112-data-classification-cache-boundary.md) 段 5）。
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
 * 認可について、**ここは防御線ではありません。** cookie を読むだけの前捌きであり、確定認可はデータ源に最も
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
 * 認可とは別に、要求の内容に依るヘッダをここで扱います —— 資格情報を載せた要求への
 * `Cache-Control`（{@link PRIVATE_CACHE_CONTROL}）と、宣言で許した別 origin への CORS ヘッダ
 * （`HTTP_ALLOWED_ORIGINS`）です。要求に依らないヘッダは `next.config.ts` が持ちます。
 * origin の判定は `model/cross-origin` が持ち、ここは判定の結果を応答へ写すだけです。
 */
export async function proxy(request: NextRequest): Promise<Response> {
  const url = new URL(request.url);

  if (getMaintenanceConfig().isStopped && !OPEN_PATHS.has(url.pathname)) {
    return OPEN_METHODS.has(request.method)
      ? NextResponse.rewrite(new URL(MAINTENANCE_PATH, url))
      : new NextResponse(null, { status: STOPPED_STATUS });
  }

  const verdict = judgeOrigin(
    {
      origin: request.headers.get("origin"),
      host: request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
    },
    getHttpConfig().allowedOrigins,
  );

  // 許していない origin からの書き込みは、handler へ届く前に止める（`docs/rules.md` #47）。
  // 読むだけの要求は止めない —— CORS ヘッダを付けないので、ブラウザ側で応答を読めない。
  if (verdict.kind === "untrusted" && isStateChanging(request.method)) {
    return new NextResponse(null, { status: 403 });
  }

  const response =
    verdict.kind === "allowed" && url.pathname.startsWith(BFF_PREFIX)
      ? await openCors(request, verdict.origin)
      : await authorize(request);

  if (request.cookies.has(SESSION_COOKIE_NAME)) {
    response.headers.set("Cache-Control", PRIVATE_CACHE_CONTROL);
  }

  return response;
}

/** 許可した別 origin からの BFF への要求。preflight はここで答え、それ以外は CORS ヘッダを添える。 */
async function openCors(request: NextRequest, origin: string): Promise<NextResponse> {
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: preflightHeadersFor(
        origin,
        request.headers.get("access-control-request-method"),
        request.headers.get("access-control-request-headers"),
      ),
    });
  }

  const response = await authorize(request);

  for (const [key, value] of Object.entries(corsHeadersFor(origin))) {
    response.headers.set(key, value);
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
 * ここへ処理を挟むと配信そのものが遅くなります。**外した経路には {@link PRIVATE_CACHE_CONTROL} も
 * 届きません** —— 画像最適化に載るのが公開画像だけであることが、その前提です。
 *
 * metadata ファイル（`robots.txt` / `sitemap.xml` / アイコン / OG 画像）も外します
 * （[0044](../docs/adr/0044-seo-metadata-strategy.md) §6）。いずれも誰でも開ける配信物で、前捌きが
 * 横取りする理由がありません。**綴りは末尾まで固定します** —— `icon` を接頭辞で外すと、その綴りで
 * 始まる画面を後から足したとき、その画面だけが前捌きを素通りします。
 *
 * `/api` は外しません。Route Handler も保護の対象になり得るためです。
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico$|icon$|apple-icon$|opengraph-image$|sitemap\\.xml$|robots\\.txt$).*)",
  ],
};
