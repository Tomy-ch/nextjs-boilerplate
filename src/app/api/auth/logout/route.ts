import { clearCartSession } from "@/adapters/server/api/cart-session"; // sample:line
import { signOut } from "@/adapters/server/auth/session";

/** ログアウト後に見せる画面。 */
const HOME_PATH = "/";

/**
 * session を破棄し、IdP 側の session も終わらせる。
 *
 * @remarks
 * POST だけを受けます。GET で破棄できると、外部サイトが `<img src>` を置くだけで利用者を
 * ログアウトさせられます。副作用のある操作を安全なメソッドに載せない、という HTTP の
 * 約束にも従います。
 *
 * IdP 側の終了に失敗しても同じ画面へ戻します。手元の cookie は既に消えているため利用者は
 * ログアウトできており、ここで失敗を見せても取れる行動がありません。
 */
export async function POST(request: Request): Promise<Response> {
  await clearCartSession(); // sample:line

  try {
    await signOut();
  } catch {
    // 意図的に握り潰す: 手元の cookie は破棄済み。
  }

  return Response.redirect(new URL(HOME_PATH, request.url), 303);
}
