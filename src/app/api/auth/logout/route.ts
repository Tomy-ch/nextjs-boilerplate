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
 * **IdP 側を終わらせるのはこの応答ではなく、次の遷移です**（{@link signOut}）。利用者を送り出す
 * ところまでがここの仕事で、戻り先は IdP が引き受けます。
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
    // cookie は破棄済みなので握り潰す（理由は POST の @remarks）。
    return null;
  }
}
