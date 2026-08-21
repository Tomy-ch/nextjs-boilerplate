import { clearCartSession } from "@/adapters/server/api/cart-session"; // sample:line
import { signOut } from "@/adapters/server/auth/session";

/** ログアウト後に見せる画面。 */
const HOME_PATH = "/";

/**
 * session を破棄し、続けて利用者を IdP のログアウトへ送り出す。
 *
 * @remarks
 * POST だけを受けます。GET で破棄できると、外部サイトが `<img src>` を置くだけで利用者を
 * ログアウトさせられます。副作用のある操作を安全なメソッドに載せない、という HTTP の
 * 約束にも従います。
 *
 * **IdP 側を終わらせるのはこの応答ではなく、次の遷移です。** IdP の session を保持しているのは
 * 利用者のブラウザの cookie なので、そこへ着かせない限り終わりません。戻り先は IdP から
 * `post_logout_redirect_uri` で戻される先が引き受けます。
 *
 * 送り先を組み立てられなくてもトップへ戻します。手元の cookie は既に消えているため利用者は
 * ログアウトできており、ここで失敗を見せても取れる行動がありません。
 */
export async function POST(request: Request): Promise<Response> {
  await clearCartSession(); // sample:line

  const destination = await resolveDestination();

  return Response.redirect(destination ?? new URL(HOME_PATH, request.url).toString(), 303);
}

/**
 * ログアウト後に送り出す先を決める。
 *
 * @returns IdP のログアウト。終わらせる口が無いとき、または引けなかったとき null
 */
async function resolveDestination(): Promise<string | null> {
  try {
    return await signOut();
  } catch {
    // 手元の cookie は破棄済み。IdP へ送れなくても、利用者から見たログアウトは成立している。
    return null;
  }
}
