import { z } from "zod";

import type { MetricKey, MetricValues } from "./budget";

/**
 * Lighthouse の結果（LHR）から指標を取り出し、試行をまとめる。
 *
 * @remarks
 * 見るのは Core Web Vitals の 3 つだけです（[0101](../../docs/adr/0101-performance-budget.md) §1）。
 * Lighthouse の performance スコアは 5 つの指標の加重平均で、下がったときに**どれが下がったか**を
 * 答えられません。指標を名指しで持つのは、赤くなった PR が次に何を見ればよいかを言えるためです。
 *
 * INP は実ユーザの操作を要するため lab では計測できません。**代わりに TBT を見ます** — Lighthouse
 * が INP の lab 代替として置いている指標で、field 値の収集経路は
 * [0082](../../docs/adr/0082-client-observability.md) が持ちます。
 */

/** LHR の audit id と、判定に使う名前の対応。 */
const AUDIT_IDS: Readonly<Record<MetricKey, string>> = {
  lcpMs: "largest-contentful-paint",
  clsScore: "cumulative-layout-shift",
  tbtMs: "total-blocking-time",
};

const auditSchema = z.object({ numericValue: z.number().nonnegative() });

const lhrSchema = z.object({
  requestedUrl: z.string(),
  runtimeError: z.object({ code: z.string(), message: z.string() }).optional(),
  audits: z.record(z.string(), z.unknown()),
});

/**
 * LHR から指標を取り出す。
 *
 * @param lhr - Lighthouse が返した結果。
 * @throws 計測そのものが失敗していた場合と、指標が欠けていた場合。
 *
 * @remarks
 * `runtimeError` を持つ結果を落とすのは、**そこに指標が 0 として入るため**です。落ちた計測を
 * 数値として扱うと、開けなかった画面が「最速の画面」として予算に収まります。
 */
export function readMetrics(lhr: unknown): MetricValues {
  const parsed = lhrSchema.parse(lhr);

  if (parsed.runtimeError !== undefined) {
    throw new Error(
      `${parsed.requestedUrl} の計測が失敗しました: ${parsed.runtimeError.code} ${parsed.runtimeError.message}`,
    );
  }

  const read = (key: MetricKey): number => {
    const audit = auditSchema.safeParse(parsed.audits[AUDIT_IDS[key]]);

    if (!audit.success) {
      throw new Error(`${parsed.requestedUrl} の LHR に ${AUDIT_IDS[key]} がありません`);
    }

    return audit.data.numericValue;
  };

  return { lcpMs: read("lcpMs"), clsScore: read("clsScore"), tbtMs: read("tbtMs") };
}

/**
 * 中央値を返す。
 *
 * @throws 値が 1 つも無い場合。
 *
 * @remarks
 * 平均ではなく中央値を採ります。CI の runner は隣の仕事の影響で 1 回だけ極端に遅い試行を出す
 * ことがあり、平均はその 1 回に引きずられます。
 *
 * 偶数個のときは小さい側を採ります。2 つの平均を採ると、どの試行にも存在しない値が予算の
 * 判定へ現れます。
 */
export function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = sorted[Math.floor((sorted.length - 1) / 2)];

  if (middle === undefined) {
    throw new Error("試行が 1 つもありません");
  }

  return middle;
}

/**
 * 試行をまとめる。
 *
 * @param runs - 同じ画面を繰り返し計測した結果。
 * @returns 指標ごとの中央値。
 *
 * @remarks
 * 中央値は**指標ごとに独立して**採ります。結果の組を 1 つ選ぶ形にすると、選ぶ基準にした指標
 * 以外は「たまたまその試行だった値」になります。
 */
export function aggregate(runs: readonly MetricValues[]): MetricValues {
  const of = (key: MetricKey): number => median(runs.map((run) => run[key]));

  return { lcpMs: of("lcpMs"), clsScore: of("clsScore"), tbtMs: of("tbtMs") };
}
