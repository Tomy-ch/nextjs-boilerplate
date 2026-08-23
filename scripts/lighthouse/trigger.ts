/**
 * 差分から、その PR を測るべきかを決める。
 *
 * @remarks
 * 全数の計測は保護ブランチと日次に置いてあります（[0101](../../docs/adr/0101-performance-budget.md)
 * §2）。ここが答えるのは**その待ち方では遅すぎる差分かどうか**だけです。
 *
 * **判定は 2 段で、根拠の種類が違います。**
 *
 * - **強制**は構造で決めます。数値を要さず、なぜ測るのかを 1 文で言えるものだけです
 * - **合図**は量で決めます。こちらは根拠のある数を置けないので、gate ではなく人へ知らせる線
 *   として扱います
 */

/** 変更されたファイル 1 件。 */
export type Change = {
  /** リポジトリルート相対のパス。 */
  readonly path: string;
  /** 増えた行と減った行の合計。 */
  readonly changedLines: number;
};

/** 差分に対する判定。 */
export type Trigger =
  | {
      /** 待たずに測る。 */
      readonly kind: "force";
      /** なぜ測るのか。人が読む。 */
      readonly reasons: readonly string[];
    }
  | {
      /** 測ったほうがよいと知らせる。 */
      readonly kind: "alert";
      /** 合図の線を超えた変更行数。 */
      readonly changedLines: number;
    }
  | {
      /** 保護ブランチでの計測に任せる。 */
      readonly kind: "skip";
    };

/** 画面の宣言。ここが動くのは、画面が増えたか開き方が変わったとき。 */
const SCREEN_DECLARATION = "e2e/lib/screens.ts";

/** 全画面が通る器。 */
const SHELL_SUFFIX = "/layout.tsx";

/** 量を数える対象。描画に効く宣言と、画面を組み立てるロジック。 */
const COUNTED_PREFIXES: readonly string[] = ["tokens/", "src/features/", "src/app/"];

/** 量から外す。描かれるものを変えない。 */
const NOT_COUNTED = /\.(test|stories)\.tsx?$|\.md$/;

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

/** 量に数えるパスか。 */
function isCounted(path: string): boolean {
  return COUNTED_PREFIXES.some((prefix) => path.startsWith(prefix)) && !NOT_COUNTED.test(path);
}

/**
 * 差分を判定する。
 *
 * @param changes - 変更されたファイルと、その変更行数。
 * @param alertAt - 合図を出す変更行数の線。
 *
 * @remarks
 * **強制が量に優先します。** 器を 1 行だけ直した差分は量では拾えませんが、効く範囲は全画面です。
 */
export function decideTrigger(changes: readonly Change[], alertAt: number): Trigger {
  const reasons = [
    ...new Set(
      changes
        .map((change) => forceReasonOf(change.path))
        .filter((reason): reason is string => reason !== undefined),
    ),
  ];

  if (reasons.length > 0) {
    return { kind: "force", reasons };
  }

  const changedLines = changes
    .filter((change) => isCounted(change.path))
    .reduce((total, change) => total + change.changedLines, 0);

  return changedLines >= alertAt ? { kind: "alert", changedLines } : { kind: "skip" };
}

/**
 * `git diff --numstat` の出力を読む。
 *
 * @remarks
 * 二進ファイルの行は行数の代わりに `-` を持ちます。行では表せないので 0 として数えます ——
 * 画像を差し替えた差分は、描画に効いても行数に現れません。
 */
export function parseNumstat(text: string): Change[] {
  return text
    .split("\n")
    .map((line) => line.split("\t"))
    .filter((columns): columns is [string, string, string] => columns.length === 3)
    .map(([added, removed, path]) => ({
      path,
      changedLines: Number.parseInt(added, 10) + Number.parseInt(removed, 10) || 0,
    }));
}
