// 基準画像の置き場（サブモジュール `baseline/images`）の区画割り。
//
// 置き場は 2 種類の撮影が共有する。story 単位の撮影は story の系統（見出しの先頭区画）で分かれ、
// 画面単位の撮影（`e2e/visual/`）は下の 1 区画に閉じる。共有するのは、掃除も撮り直しも置き場
// 1 つに対して働くためで、分けると同じ機構を 2 組持つことになる。

/** 置き場の位置。リポジトリルートからの相対。 */
export const STORE_PATH = "baseline/images";

/**
 * 画面単位の基準画像が占める区画。
 *
 * @remarks
 * story の系統はここを名乗れません。名乗ると、画面の基準画像が story の孤児として上がるか、
 * その逆になります。衝突していないことは {@link assertAreaUnclaimed} が確かめます。
 */
export const SCREEN_AREA = "screen";

/** 撮り直しの最中であることを伝える環境変数。`make vrt-update` / `make e2e-update` が立てる。 */
export const RETAKE_ENV = "BASELINE_RETAKE";

/**
 * story の全数撮り直しでも消さない置き場の要素。
 *
 * @remarks
 * `screen` は画面単位の撮影が持つ区画で、story の撮影は 1 枚も書きません。残りは置き場自身の
 * 説明と、絵を決める入力のハッシュです。
 */
const PRESERVED_ENTRIES: ReadonlySet<string> = new Set([
  SCREEN_AREA,
  "README.md",
  "render-inputs.sha256",
]);

/**
 * story の全数撮り直しの前に消す要素を返す。
 *
 * @remarks
 * **撮り直しは stale なファイルを消しません。** Playwright の `--update-snapshots` は撮った
 * ぶんを書くだけなので、story を改名・削除すると旧名の画像が置き場に残り、対応の検査が孤児
 * として落とします。撮り直しても直らないため、全数のときだけ先に区画を空にします。
 *
 * **範囲を絞った撮り直しでは呼んではいけません。** 撮らない story の画像まで消え、報告されて
 * いない差分が置き場へ入ります。絞り込みが起きていないことの判定は呼ぶ側が持ちます。
 *
 * **残す側を列挙しているので、置き場の直下へ story 以外の要素を足すときは
 * {@link PRESERVED_ENTRIES} も更新してください。** 足し忘れると、全数の撮り直しのたびに黙って
 * 消えます。ここを「story の系統だけを消す」向きに書けないのは、story の系統名が見出しから
 * 決まり、増減を置き場の側から知る手段が無いためです。
 *
 * @param entries - 置き場の直下にある要素の名前
 */
export function clearableStoryEntries(entries: readonly string[]): string[] {
  return entries.filter((entry) => !entry.startsWith(".") && !PRESERVED_ENTRIES.has(entry));
}

/**
 * いま撮り直している最中か。
 *
 * @remarks
 * 撮り直しの最中は、置き場が「これから書かれる画像」をまだ持ちません。撮影は並行して走るので、
 * 対応の検査は他の撮影の途中経過を欠けとして読みます。検査が守るのはコミットされた状態なので、
 * 撮り直しの最中は見ません（比較の実行では必ず走ります）。
 *
 * Playwright の `updateSnapshots` を読みません。既定値が `none` ではないため、撮り直していない
 * 実行まで撮り直し扱いになり、**検査が黙って消えます**。撮り直しを起こした側が明示します。
 */
export function isRetaking(environment: Readonly<Record<string, string | undefined>>): boolean {
  return environment[RETAKE_ENV] === "1";
}

/**
 * story の系統が予約区画を名乗っていないことを確かめる。
 *
 * @remarks
 * 系統は story の見出しから機械的に決まる（`storyGroup`）ため、`Screen/…` という見出しを付けた
 * 時点で衝突します。落とすのは撮る前で、撮ったあとでは両者の画像が同じ場所に混ざります。
 *
 * @param groups - 撮影対象の story の系統
 */
export function assertAreaUnclaimed(groups: readonly string[]): void {
  if (groups.includes(SCREEN_AREA)) {
    throw new Error(
      `story の系統が画面単位の区画（${SCREEN_AREA}）と衝突しています。story の見出しの先頭区画を変えてください`,
    );
  }
}
