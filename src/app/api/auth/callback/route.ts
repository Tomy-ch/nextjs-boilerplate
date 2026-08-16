import { mergeGuestCart } from "@/adapters/server/api/cart"; // sample:line
import { getSessionResolver } from "@/adapters/server/auth/resolver";
import { storeSession, takeTransaction } from "@/adapters/server/auth/session";
import { getLogger } from "@/logging/logging.server";
import { toSafeReturnUrl } from "@/model/return-url";

/** 認証をやり直させる先。 */
const LOGIN_PATH = "/login";

// sample:begin
/**
 * 未認証のまま貯めた状態を、確立した session の主体へ引き継ぐ。
 *
 * @remarks
 * **失敗させません。** ログインの成否は認証の成否で決まり、それに付随する処理の結果を従属させません
 * （[0079](../../../../../docs/adr/0079-auth-frontend-seam.md) §7）。利用者から見えるのはログインの
 * 成功だけで、引き継げなかったことは記録から辿ります。
 *
 * 起こすのはここだけです。未認証時の識別子と確立直後の session が同時に手元にあるのはこの 1 箇所で、
 * 複数の起点を持つと同じ状態遷移に二重適用と競合の面が増えます。
 */
async function takeOverGuestState(): Promise<void> {
  try {
    const result = await mergeGuestCart();

    if (
      result !== null &&
      (result.clampedProductIds.length > 0 || result.droppedProductIds.length > 0)
    ) {
      reportQuietly(() =>
        getLogger().info("ゲストのカートの一部を引き継げませんでした", {
          clamped: result.clampedProductIds.length,
          dropped: result.droppedProductIds.length,
        }),
      );
    }
  } catch (cause) {
    reportQuietly(() =>
      getLogger().warn("ゲストのカートを引き継げませんでした", { cause: String(cause) }),
    );
  }
}

/**
 * 記録できないことでログインを止めない。
 *
 * @remarks
 * 記録は引き継ぎの失敗を後から辿るための手段で、利用者に見せる結果ではありません。書き出す側が
 * 落ちるとログイン自体が失敗するため、ここで止めます。
 */
function reportQuietly(report: () => void): void {
  try {
    report();
  } catch {
    // 意図的に握り潰す: 記録の失敗を利用者へ持ち出さない。
  }
}
// sample:end

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
    await takeOverGuestState(); // sample:line

    // 復帰先は認可要求の時点で検証済みだが、cookie を経由して戻ってきた値なのでもう一度通す。
    // 検証を入口の 1 回に頼ると、cookie を差し替えられる経路が見つかった時点で外部へ飛ばせる。
    return Response.redirect(new URL(toSafeReturnUrl(transaction.returnUrl), request.url), 302);
  } catch {
    return Response.redirect(new URL(LOGIN_PATH, request.url), 302);
  }
}
