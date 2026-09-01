/** 目盛りの本数の上限。これより多いと、数字どうしが 12px の字で隣り合う。 */
const TICK_COUNT = 5;

/**
 * 刻み幅として採る倍率。1 桁ぶんの中を、この順に見る。
 *
 * @remarks
 * 10 倍を並べていないのは、選ぶ余地が無いためです。`rough` は 1 桁ぶんの上限（`magnitude` の
 * 10 倍）を超えないので、1・2・5 で足りなければ 10 倍で必ず足ります。並べると、決して選ばれない
 * 最後の候補として残ります。
 */
const STEP_FACTORS = [1, 2, 5] as const;

/** 帯を並べる軸。 */
export type BarAxis = {
  /** 0 から始まる昇順の目盛り。 */
  readonly ticks: readonly number[];
  /** 軸の右端。帯の長さはこの値に対する割合で決まる。 */
  readonly max: number;
};

/**
 * 刻み幅を、rough を覆う切りのよい値へ丸める。
 *
 * @remarks
 * 1・2・5 とその 10 倍だけを採ります。7 や 30 のような幅で刻むと、目盛りの数字から帯の
 * 長さを暗算で読めなくなります。
 */
function niceStep(rough: number): number {
  const magnitude = 10 ** Math.max(0, Math.floor(Math.log10(rough)));
  const factor = STEP_FACTORS.find((candidate) => rough <= candidate * magnitude) ?? 10;

  return factor * magnitude;
}

/**
 * 件数の並びを覆う軸を求める。
 *
 * @remarks
 * **0 から始めます。** 帯の長さを比べる図なので、始点を最小値へ寄せると短い帯が実際より
 * 短く見えます。
 *
 * **刻み幅は整数です。** 件数は整数しか取らないため、0.5 のような刻みは存在しない値を軸へ
 * 並べます。
 *
 * @param counts - 並べる件数。空でもよい
 * @returns 目盛りと右端。件数が無くても目盛りは 2 つ以上返す
 */
export function barAxis(counts: readonly number[]): BarAxis {
  const largest = Math.max(1, ...counts);
  const step = niceStep(largest / (TICK_COUNT - 1));
  const max = Math.ceil(largest / step) * step;
  const ticks: number[] = [];

  for (let tick = 0; tick <= max; tick += step) {
    ticks.push(tick);
  }

  return { ticks, max };
}

/**
 * 値が軸のどこに来るかを、CSS の百分率で返す。
 *
 * @remarks
 * 帯の長さと目盛りの位置が同じ尺に乗るよう、どちらもここを通ります。別々に組むと、片方だけを
 * 直したときに帯の先と目盛りの位置がずれます。
 *
 * @param value - 軸の上に置く値
 * @param axis - {@link barAxis} が返した軸
 */
export function axisPercent(value: number, axis: BarAxis): string {
  return `${(value / axis.max) * 100}%`;
}
