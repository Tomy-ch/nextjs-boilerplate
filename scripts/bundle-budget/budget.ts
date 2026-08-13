import { parse } from "yaml";
import { z } from "zod";

/**
 * client JavaScript の予算の読み取りと判定。
 *
 * @remarks
 * 値そのものは [`performance-budget.yaml`](../../performance-budget.yaml) が持ちます。コードの外へ
 * 出してあるのは、[0101](../../docs/adr/0101-performance-budget.md) が具体値を fork 先の判断として
 * いるためです。fork 先が触るのは値だけで、判定を読む必要はありません。
 *
 * 根拠を必須項目にしてあるのは、宣言だけが増えて理由が残らない状態を作らないためです。空文字は
 * 読み込みの時点で落ちます。
 */

const entrySchema = z.object({
  gzipKb: z.number().positive(),
  reason: z.string().trim().min(1),
});

const budgetSchema = z.object({
  routes: z.record(z.string(), entrySchema),
  growth: entrySchema,
});

/** 予算の宣言。 */
export type Budget = z.infer<typeof budgetSchema>;

/** route 1 つぶんの計測結果。 */
export type Measurement = {
  /** 公開されている route。 */
  readonly route: string;
  /** gzip した合計（byte）。 */
  readonly gzip: number;
};

/** route 1 つぶんの判定。 */
export type Verdict = Measurement & {
  /** base での同じ route の計測。base に無い route なら `undefined`。 */
  readonly baseGzip: number | undefined;
  /** 上限（byte）。宣言が無ければ `undefined`。 */
  readonly limit: number | undefined;
  /** 上限を超えた量（byte）。超えていなければ `undefined`。 */
  readonly overLimit: number | undefined;
  /** 増分の上限を超えた量（byte）。超えていなければ `undefined`。 */
  readonly overGrowth: number | undefined;
};

const BYTES_PER_KB = 1024;

/**
 * 宣言を読む。
 *
 * @param text - `performance-budget.yaml` の中身。
 * @throws 形が合わない場合と、根拠が空の場合。
 */
export function parseBudget(text: string): Budget {
  return budgetSchema.parse(parse(text));
}

/**
 * 計測を判定する。
 *
 * @remarks
 * 上限は宣言のある route にだけ効き、増分は全 route に効きます。base に無い route（この PR で
 * 増えた route）は増分を判定できないため、上限だけを見ます。
 *
 * @param current - この PR の計測。
 * @param base - base ブランチの計測。取れない場合は空で渡す。
 * @param budget - 宣言。
 * @returns 計測と同じ順序の判定。
 */
export function judge(
  current: readonly Measurement[],
  base: readonly Measurement[],
  budget: Budget,
): Verdict[] {
  const baseByRoute = new Map(base.map((row) => [row.route, row.gzip]));
  const growthLimit = budget.growth.gzipKb * BYTES_PER_KB;

  return current.map((row) => {
    const declared = budget.routes[row.route];
    const limit = declared === undefined ? undefined : declared.gzipKb * BYTES_PER_KB;
    const baseGzip = baseByRoute.get(row.route);
    const growth = baseGzip === undefined ? 0 : row.gzip - baseGzip;

    return {
      ...row,
      baseGzip,
      limit,
      overLimit: limit !== undefined && row.gzip > limit ? row.gzip - limit : undefined,
      overGrowth: growth > growthLimit ? growth - growthLimit : undefined,
    };
  });
}

/** 判定が 1 つでも超過しているか。 */
export function hasFailure(verdicts: readonly Verdict[]): boolean {
  return verdicts.some((v) => v.overLimit !== undefined || v.overGrowth !== undefined);
}

/**
 * 宣言されているのに計測されなかった route。
 *
 * @remarks
 * route の名前が変わると、宣言はそのまま残るのに誰も照らされなくなります。上限を持つ route が
 * 消えたことは、予算に収まったことと見分けが付かないため、別に検出します。
 */
export function missingRoutes(current: readonly Measurement[], budget: Budget): string[] {
  const measured = new Set(current.map((row) => row.route));

  return Object.keys(budget.routes).filter((route) => !measured.has(route));
}
