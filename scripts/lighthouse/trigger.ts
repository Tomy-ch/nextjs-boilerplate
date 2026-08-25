/**
 * 差分から、その PR を測るべきかを決める。
 *
 * @remarks
 * 全数の計測は保護ブランチと日次に置いてあります（[0101](../../docs/adr/0101-performance-budget.md)
 * §2）。ここが答えるのは**その待ち方では遅すぎる差分かどうか**だけです。
 *
 * **判定は構造だけで行います。**量で見る合図は
 * [`../deferred-checks/volume.ts`](../deferred-checks/volume.ts) が持ちます。分担の理由は
 * [0101](../../docs/adr/0101-performance-budget.md) §2 と
 * [0153](../../docs/adr/0153-ci-configuration.md) §2。
 */

import type { Change } from "../lib/numstat";

/** 差分に対する判定。 */
export type Trigger =
  | {
      /** 待たずに測る。 */
      readonly kind: "force";
      /** なぜ測るのか。人が読む。 */
      readonly reasons: readonly string[];
    }
  | {
      /** 保護ブランチでの計測に任せる。 */
      readonly kind: "skip";
    };

/** 画面の宣言。ここが動くのは、画面が増えたか開き方が変わったとき。 */
const SCREEN_DECLARATION = "e2e/lib/screens.ts";

/** 全画面が通る器。 */
const SHELL_SUFFIX = "/layout.tsx";

/**
 * そのパスが待たずに測る理由に当たるなら、その理由。
 *
 * @remarks
 * どちらも「その差分が何を意味するか」で選んでいます。画面を足すと宣言が必ず動くので、前者は
 * **一度も測られていない画面が生まれた**ことを指します。後者は全画面が通る器です。
 */
function forceReasonOf(path: string): string | undefined {
  if (path === SCREEN_DECLARATION) {
    return "画面の宣言が動いています。まだ一度も測られていない画面があるかもしれません";
  }

  if (path.startsWith("src/app/") && path.endsWith(SHELL_SUFFIX)) {
    return "器（layout）が動いています。全ての画面がこれを通ります";
  }

  return undefined;
}

/**
 * 差分を判定する。
 *
 * @param changes - 変更されたファイルと、その変更行数。
 *
 * @remarks
 * 器を 1 行だけ直した差分は量では拾えませんが、効く範囲は全画面です。構造で見るのはそのためです。
 */
export function decideTrigger(changes: readonly Change[]): Trigger {
  const reasons = [
    ...new Set(
      changes
        .map((change) => forceReasonOf(change.path))
        .filter((reason): reason is string => reason !== undefined),
    ),
  ];

  return reasons.length > 0 ? { kind: "force", reasons } : { kind: "skip" };
}
