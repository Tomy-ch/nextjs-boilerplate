import type { Verdict } from "./budget";

/**
 * 判定を PR コメントの本文へ畳む。
 *
 * @remarks
 * 落ちた人が最初に知りたいのは「どの route が、何に対して、どれだけ超えたか」です。上限と増分は
 * 別の理由で鳴るため、列を分けて両方を出します。
 */

const BYTES_PER_KB = 1024;

/** byte を KB の文字列へ。 */
function kb(bytes: number): string {
  return `${(bytes / BYTES_PER_KB).toFixed(1)} KB`;
}

/** 増分を符号つきで。 */
function delta(current: number, base: number | undefined): string {
  if (base === undefined) {
    return "—";
  }

  // 丸めてから符号を決める。先に符号を見ると、1 byte 減っただけの route が `-0.0 KB` になる。
  const rounded = Number(((current - base) / BYTES_PER_KB).toFixed(1)) || 0;

  return `${rounded >= 0 ? "+" : ""}${rounded.toFixed(1)} KB`;
}

/** 1 行ぶんの判定を語にする。 */
function statusOf(verdict: Verdict): string {
  if (verdict.overLimit !== undefined && verdict.overGrowth !== undefined) {
    return `❌ 上限 +${kb(verdict.overLimit)} / 増分 +${kb(verdict.overGrowth)}`;
  }

  if (verdict.overLimit !== undefined) {
    return `❌ 上限 +${kb(verdict.overLimit)}`;
  }

  if (verdict.overGrowth !== undefined) {
    return `❌ 増分 +${kb(verdict.overGrowth)}`;
  }

  return verdict.limit === undefined ? "—" : "✅";
}

/**
 * 表を組み立てる。
 *
 * @param verdicts - 判定。大きい route から並べ替えて出す。
 */
export function renderReport(verdicts: readonly Verdict[]): string {
  const rows = [...verdicts].sort((a, b) => b.gzip - a.gzip);
  const lines = [
    "| route | gzip | base 比 | 上限 | 判定 |",
    "| --- | --- | --- | --- | --- |",
    ...rows.map(
      (v) =>
        `| \`${v.route}\` | ${kb(v.gzip)} | ${delta(v.gzip, v.baseGzip)} | ${
          v.limit === undefined ? "—" : kb(v.limit)
        } | ${statusOf(v)} |`,
    ),
  ];

  return lines.join("\n");
}
