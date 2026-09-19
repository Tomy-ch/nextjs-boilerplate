// 分割した 1 台が、テスト結果の外で落ちたことを報告へ載せる。
//
// 合流側が読むのは実行系の JSON レポートだけで、そこに現れるのは**ケースの成否とカバレッジ**である。
// 台の vitest が失敗を 1 件も記録せずに非ゼロで終わったとき（実行系そのものの異常、後始末で投げた
// 例外、機械の停止）、その事実はどの台のどのファイルにも残らない。合流は成立し、本文は「全件通りました」
// と述べる —— 検査は赤いのに、本文だけが緑を主張する状態になる（[README](../README.md)）。
//
// 各台は自分の終了コードを書き出し、合流側がそれを読む。**判定は台が持ち、ここは運ぶだけ**である。

/** 分割の 1 台が、何を返して終わったか。 */
export type ShardOutcome = {
  /** 台の名乗り（`3/4` の形）。 */
  readonly shard: string;
  readonly exitCode: number;
  /** その台自身のログの末尾。合流側の機械には無いので、台が書いたものを運ぶ。 */
  readonly tail: string;
};

const TAIL_MARKER = "--- tail ---";

/**
 * 台が書き出した 1 件を読む。
 *
 * @remarks
 * 読めない綴りは**捨てずに終了コード不明として残す**。台が書いたファイルが在る以上その台は走って
 * おり、形が変わったことを「異常なし」へ倒すと、変わった瞬間から永久に通る。
 */
export function parseShardOutcome(content: string): ShardOutcome {
  const [head = "", tail = ""] = content.split(`${TAIL_MARKER}\n`, 2);
  const fields = new Map(
    head
      .split("\n")
      .map((line) => line.split("=", 2))
      .filter((pair): pair is [string, string] => pair.length === 2)
      .map(([key, value]) => [key.trim(), value.trim()]),
  );

  const rawExit = fields.get("exit") ?? "";
  const exitCode = /^-?\d+$/.test(rawExit) ? Number(rawExit) : Number.NaN;

  return { shard: fields.get("shard") || "(不明な台)", exitCode, tail: tail.trimEnd() };
}

/** 落ちた台だけを、名乗りの順で返す。 */
export function failedShards(outcomes: readonly ShardOutcome[]): readonly ShardOutcome[] {
  return outcomes
    .filter((outcome) => outcome.exitCode !== 0)
    .toSorted((a, b) => a.shard.localeCompare(b.shard, "en"));
}

/**
 * 落ちた台を報告の本文へ組む。落ちた台が無ければ空文字を返す。
 *
 * @remarks
 * **テストの集計より前に置く。** 集計は「通った」としか言えないので、後ろに置くと読み手は先に
 * 緑を読み、赤の理由に辿り着く前に納得してしまう。
 */
export function formatShardOutcomes(
  outcomes: readonly ShardOutcome[],
  fence: (text: string) => readonly string[],
): string {
  const failed = failedShards(outcomes);
  if (failed.length === 0) return "";

  const lines: string[] = [
    `**${failed.length} 台が、テスト結果の外で落ちています。**` +
      "合流した結果には失敗が現れないため、下のテストの集計だけでは緑に見えます。",
    "",
  ];

  for (const outcome of failed) {
    const code = Number.isNaN(outcome.exitCode) ? "不明" : String(outcome.exitCode);
    lines.push(`### 台 ${outcome.shard} —— 終了コード ${code}`, "");
    lines.push(...fence(outcome.tail || "(その台のログが空でした)"), "");
  }

  return lines.join("\n").trimEnd();
}
