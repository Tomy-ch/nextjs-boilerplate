// code scanning へ取り込む SARIF を整える。

/** SARIF の 1 実行分。整えるのは `results` だけなので、他は形を問わずそのまま運ぶ。 */
type SarifRun = { results?: unknown };

/** 抑止されたかどうかを判定するのに要る形だけを持つ結果。 */
type SarifResult = { suppressions?: unknown };

/** 読み込んだ SARIF。 */
type SarifLog = { runs?: unknown };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * ソースで抑止された所見かどうか。
 *
 * @remarks
 * SARIF は抑止を `suppressions` の**空でない配列**で表します。`opengrep` は
 * `// nosemgrep:` が付いた所見をこの形で残すため、判定はその有無だけで足ります。
 */
function isSuppressed(result: unknown): boolean {
  if (!isRecord(result)) {
    return false;
  }

  const { suppressions } = result as SarifResult;

  return Array.isArray(suppressions) && suppressions.length > 0;
}

/**
 * 取り込める形へ整えた SARIF を返す。
 *
 * @remarks
 * 2 つを行います。
 *
 * **抑止済みの所見を落とす。** `opengrep` の text 出力は `// nosemgrep:` を尊重して所見を消し
 * ますが、SARIF には `suppressions` を付けたまま残します。GitHub の code scanning はそれを
 * 閉じた alert として扱わないため、そのまま渡すとゲートは緑のまま Security タブにだけ所見が
 * 積み上がります。`.makefiles/security/opengrep.mk` が置いている「ゲートと取り込みは同じ走査を
 * 指す」という前提が、そこで崩れます。落とす判断はソースの `// nosemgrep:` が既に持っているので、
 * ここはその判断を取り込みの側へ運ぶだけで、新しい抑止は導入しません。
 *
 * **`results` を必ず配列にする。** `bearer` は所見が 1 件も無いとき `results` を `null` で書き
 * 出しますが、SARIF 2.1.0 で `results` は配列であり `null` は取れません。GitHub 側の検証が
 * 落ちると、走査は通ったのに取り込みだけが失敗し、**所見が無いことと報告できていないことが
 * 見分けられなくなります**。
 *
 * 読めない形はそのまま返します。ここが落とす判断を持つと、SARIF を作った側の問題が
 * この工程の失敗として現れ、原因の在り処がずれます。
 *
 * @param sarif - スキャナが書き出した SARIF
 * @returns 抑止済みの所見を除き、`results` を配列に揃えた SARIF
 */
export function normalizeSarif(sarif: unknown): unknown {
  if (!isRecord(sarif)) {
    return sarif;
  }

  const { runs } = sarif as SarifLog;

  if (!Array.isArray(runs)) {
    return sarif;
  }

  return {
    ...sarif,
    runs: runs.map((run) => {
      if (!isRecord(run)) {
        return run;
      }

      const { results } = run as SarifRun;

      if (results === null || results === undefined) {
        return { ...run, results: [] };
      }

      if (!Array.isArray(results)) {
        return run;
      }

      return { ...run, results: results.filter((result) => !isSuppressed(result)) };
    }),
  };
}
