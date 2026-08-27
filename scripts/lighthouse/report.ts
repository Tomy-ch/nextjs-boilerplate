import { METRIC_KEYS, type MetricKey, type Verdict } from "./budget";

/**
 * 判定を PR コメントの本文へ畳む。
 *
 * @remarks
 * 落ちた人が最初に知りたいのは「どの画面の、どの指標が、どれだけ超えたか」です。指標ごとに列を
 * 分けるのは、performance スコア 1 つでは次に何を見ればよいかを答えられないためです。
 */

/** 指標の見出しと、値の書き方。 */
const METRIC_FORMAT: Readonly<Record<MetricKey, { label: string; format: (v: number) => string }>> =
  {
    lcpMs: { label: "LCP", format: (v) => `${(v / 1000).toFixed(2)} s` },
    clsScore: { label: "CLS", format: (v) => v.toFixed(3) },
    tbtMs: { label: "TBT", format: (v) => `${Math.round(v)} ms` },
  };

/** 1 つの指標を「値 / 上限」の形にする。超過していれば印を付ける。 */
function cell(verdict: Verdict, key: MetricKey): string {
  const { format } = METRIC_FORMAT[key];
  const measured = format(verdict.values[key]);
  const limit = format(verdict.limits[key]);
  const over = verdict.over[key];

  return over === undefined
    ? `${measured} / ${limit}`
    : `❌ ${measured} / ${limit}（+${format(over)}）`;
}

/**
 * 表を組み立てる。
 *
 * @param verdicts - 判定。
 * @param runs - 1 画面あたりの試行回数。中央値であることが読み取れるように添える。
 *
 * @remarks
 * 超過した画面を先に並べます。全画面を出すのは、超過していない画面の余裕がどれだけ残って
 * いるかが、次に重くする判断の材料になるためです。
 */
export function renderReport(verdicts: readonly Verdict[], runs: number): string {
  const failed = verdicts.filter((verdict) => Object.keys(verdict.over).length > 0);
  const passed = verdicts.filter((verdict) => Object.keys(verdict.over).length === 0);
  const rows = [...failed, ...passed];

  return [
    `${runs} 回ずつ計測した中央値と、その画面へ効いた上限。`,
    "",
    `| 画面 | ${METRIC_KEYS.map((key) => METRIC_FORMAT[key].label).join(" | ")} |`,
    `| --- | ${METRIC_KEYS.map(() => "---").join(" | ")} |`,
    ...rows.map(
      (verdict) =>
        `| \`${verdict.name}\` | ${METRIC_KEYS.map((key) => cell(verdict, key)).join(" | ")} |`,
    ),
  ].join("\n");
}
