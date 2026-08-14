// 基準画像の置き場（サブモジュール `vrt/screenshots`）の区画割り。
//
// 置き場は 2 種類の撮影が共有する。story 単位の撮影は story の系統（見出しの先頭区画）で分かれ、
// 画面単位の撮影（`e2e/visual/`）は下の 1 区画に閉じる。共有するのは、掃除も撮り直しも置き場
// 1 つに対して働くためで、分けると同じ機構を 2 組持つことになる。

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
