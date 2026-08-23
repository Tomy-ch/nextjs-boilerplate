/**
 * 差分の量から、先送りにした検査を「この PR で回しておくべき」と知らせるかを決める。
 *
 * @remarks
 * `a11y` / `e2e` / `lighthouse` は既定では PR で回らず、保護ブランチへの merge と日次が全数を
 * 持ちます（各ワークフローの冒頭と ADR 0091 §3）。**ここが答えるのは、その待ち方で構わないかを
 * 人が判断する材料だけ**で、ゲートではありません。
 *
 * 量で決めているのは、根拠のある数を置けないためです。構造で決まる理由 —— 画面の宣言が動いた、
 * 器が動いた —— は lighthouse が自分で持ちます（[`../lighthouse/trigger.ts`](../lighthouse/trigger.ts)）。
 * そちらは数を要さず、なぜ測るのかを 1 文で言えます。こちらは言えないので、赤にせず知らせます。
 */
import type { Change } from "../lib/numstat";

/**
 * 量に数えるパス。
 *
 * @remarks
 * 先送りにした 3 つの検査が見るものの和集合です。`src/` は描画とロジック、`tokens/` は配色と
 * 寸法、`.storybook/` は story の写り方、`e2e/` と `vrt/` は検査そのものの実装。
 */
const COUNTED_PREFIXES: readonly string[] = [
  "src/",
  "tokens/",
  ".storybook/",
  "e2e/",
  "vrt/",
] as const;

/**
 * 量から外す。
 *
 * @remarks
 * 外すのは単体テストと散文だけです。**story と spec は外しません** —— story は撮影と axe の対象
 * そのもので、spec は検査の手順そのものなので、動けば結果が動きます。
 */
const NOT_COUNTED = /\.test\.tsx?$|\.md$/;

/** 量に数えるパスか。 */
export function isCounted(path: string): boolean {
  return COUNTED_PREFIXES.some((prefix) => path.startsWith(prefix)) && !NOT_COUNTED.test(path);
}

/** 数える対象の変更行数を合計する。 */
export function countChangedLines(changes: readonly Change[]): number {
  return changes
    .filter((change) => isCounted(change.path))
    .reduce((total, change) => total + change.changedLines, 0);
}
