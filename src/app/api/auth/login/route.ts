import { getSessionResolver } from "@/adapters/server/auth/resolver";
import { storeTransaction } from "@/adapters/server/auth/session";
import { toSafeReturnUrl } from "@/model/return-url";

/** 認証を始められなかったときに戻す先。 */
const LOGIN_PATH = "/login";

/**
 * 認可要求を組み立て、IdP へ送り出す。
 *
 * @remarks
 * 画面が持つのは「このリンクへ遷移する」だけです（[0079](../../../../../docs/adr/0079-auth-frontend-seam.md) §6）。
 * 認可要求の組み立てと一時状態の保管を画面側に置くと、client のコードが PKCE の検証子に
 * 触れることになります。
 *
 * 復帰先は受け取った時点で検証し、以降は検証済みの値だけを持ち回ります。入口で 1 度だけ
 * 検証するのは、経路の途中で検証し忘れる箇所を作らないためです。
 */
export async function GET(request: Request): Promise<Response> {
  const returnUrl = toSafeReturnUrl(new URL(request.url).searchParams.get("returnUrl"));

  try {
    const { authorizationUrl, transaction } =
      await getSessionResolver().startAuthorization(returnUrl);

    await storeTransaction(transaction);

    return Response.redirect(authorizationUrl, 302);
  } catch {
    // IdP へ到達できないときにここで落ちると、利用者には本文の無い 500 だけが残り、戻る手段が
    // 無くなる。認証を始められなかっただけなので、始めた場所へ返して再試行させる
    // （[0080](../../../../../docs/adr/0080-error-handling.md)）。
    const failed = new URL(LOGIN_PATH, request.url);
    failed.searchParams.set("error", "unavailable");
    failed.searchParams.set("returnUrl", returnUrl);

    return Response.redirect(failed, 302);
  }
}
