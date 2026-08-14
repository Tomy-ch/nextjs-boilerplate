import { getSessionResolver } from "@/adapters/server/auth/resolver";
import { storeTransaction } from "@/adapters/server/auth/session";
import { toSafeReturnUrl } from "@/model/return-url";

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
  const { authorizationUrl, transaction } =
    await getSessionResolver().startAuthorization(returnUrl);

  await storeTransaction(transaction);

  return Response.redirect(authorizationUrl, 302);
}
