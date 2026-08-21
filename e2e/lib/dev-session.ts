// 役割の要る画面を開くための入口。
//
// アプリ側の宣言（`src/features/dev-session/paths.ts`）を写す。読み込まないのは、feature の内部へ
// 触れてよいのが app 層だけであるため（[0021](../../docs/adr/0021-frontend-responsibility.md)）。
// 検査の側がその境界を越えても eslint の境界検査は `src/**` しか見ないので、越えたことに誰も
// 気づかない。テスト専用の session 発行の口を `test.ts` が写しているのと同じ扱いにする。
//
// 経路のずれは E2E が捕まえる。宣言した route は build の出力と突き合わせるので
// （`screens.ts`）、アプリ側が動いてこちらが取り残されれば「画面の宣言がありません」で落ちる。

/** IdP を通さずに session を発行する画面。開発と CI でだけ開く。 */
export const DEV_SESSION_PATH = "/dev/session";

/** 発行したあとの戻り先を持ち回るための検索条件の名前。 */
export const DEV_SESSION_RETURN_PARAM = "returnUrl";
