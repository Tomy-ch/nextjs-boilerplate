import { getSessionResolver } from "@/adapters/server/auth/resolver";
import { storeSession, takeTransaction } from "@/adapters/server/auth/session";
import { toSafeReturnUrl } from "@/model/return-url";

/** 認証をやり直させる先。 */
const LOGIN_PATH = "/login";

/**
 * 認可コードを受け取り、session を確立して元の画面へ戻す。
 *
 * @remarks
 * 失敗はすべてログイン画面へ戻します。ここで理由を画面へ持ち出さないのは、`state` 不一致や
 * 復号失敗のような検証結果が、攻撃者に「何が通って何が弾かれたか」を教える材料になるためです。
 * 利用者にとってはどの失敗も「やり直す」しかありません。
 *
 * IdP がエラーを返した場合（利用者が同意を拒否した等）も同じ扱いにします。
 */
export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const code = params.get("code");
  const state = params.get("state");
  const transaction = await takeTransaction();

  if (code === null || state === null || transaction === null) {
    return Response.redirect(new URL(LOGIN_PATH, request.url), 302);
  }

  try {
    const record = await getSessionResolver().completeAuthorization({ code, state, transaction });

    await storeSession(record);

    // 復帰先は認可要求の時点で検証済みだが、cookie を経由して戻ってきた値なのでもう一度通す。
    // 検証を入口の 1 回に頼ると、cookie を差し替えられる経路が見つかった時点で外部へ飛ばせる。
    return Response.redirect(new URL(toSafeReturnUrl(transaction.returnUrl), request.url), 302);
  } catch {
    return Response.redirect(new URL(LOGIN_PATH, request.url), 302);
  }
}
