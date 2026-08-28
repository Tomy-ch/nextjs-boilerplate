import "server-only";

import { type Histogram, metrics } from "@opentelemetry/api";
import { ATTR_HTTP_ROUTE } from "@opentelemetry/semantic-conventions";

/**
 * この計装を名乗る scope。
 *
 * @remarks
 * scope が指すのは計測した対象ではなく**計測した仕組み**です。ここから出る計器はすべて
 * ブラウザ由来なので、サーバー自身が出す signal と scope で見分けられます。
 */
const SCOPE = "browser-telemetry";

/**
 * 指標が取りうる値の刻み。
 *
 * @remarks
 * ミリ秒を想定した既定の刻みは、0 から 1 に収まる `CLS` に当たりません。指標ごとに分ける理由と、
 * これが good / poor の境界ではないことは、[README](./README.md) の「ブラウザ側のシグナル」が持ちます。
 */
const BOUNDARIES = {
  /** 読み込みの時間。秒台まで伸びるので、後半を粗くして端を落とさない。 */
  LOADING: [0, 100, 250, 500, 750, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 7500, 10000],
  /** 操作の応答。1 フレーム（約 16 ms）から始めて、数百 ms までを細かく見る。 */
  INTERACTION: [0, 16, 32, 50, 75, 100, 150, 200, 300, 500, 750, 1000],
  /** ずれの量。無次元で、実測は 0 から 1 の間に収まる。 */
  SHIFT: [0, 0.01, 0.025, 0.05, 0.1, 0.15, 0.25, 0.4, 0.6, 1],
} satisfies Readonly<Record<string, number[]>>;

/** 指標ごとの計器。単位も値の刻みも違うので、1 つにまとめず指標ごとに分ける。 */
const INSTRUMENTS = {
  LCP: { unit: "ms", description: "Largest Contentful Paint", boundaries: BOUNDARIES.LOADING },
  INP: { unit: "ms", description: "Interaction to Next Paint", boundaries: BOUNDARIES.INTERACTION },
  CLS: { unit: "1", description: "Cumulative Layout Shift", boundaries: BOUNDARIES.SHIFT },
  FCP: { unit: "ms", description: "First Contentful Paint", boundaries: BOUNDARIES.LOADING },
  TTFB: { unit: "ms", description: "Time to First Byte", boundaries: BOUNDARIES.LOADING },
  FID: { unit: "ms", description: "First Input Delay", boundaries: BOUNDARIES.INTERACTION },
} satisfies Readonly<Record<string, { unit: string; description: string; boundaries: number[] }>>;

/** 計器を持つ指標の綴り。契約がこれ以外を増やすと、呼び出し側が型で落ちる。 */
type Instrumented = keyof typeof INSTRUMENTS;

/** ブラウザが測った Web Vitals 1 件。 */
type WebVital = Readonly<{
  /** 指標の綴り。 */
  name: Instrumented;
  /** 測定値。時間の指標は ms、`CLS` は無次元。 */
  value: number;
  /** web.dev の境界による良し悪し。 */
  rating: string;
  /** どの遷移で得られた測定か。 */
  navigationType: string;
  /** 測定した画面の route の型。 */
  route: string;
}>;

const histograms = new Map<Instrumented, Histogram>();

/**
 * ブラウザが測った Web Vitals を OTel の metric として記録する。
 *
 * @remarks
 * 分布として持つ理由・log の event にしない理由・計器の名前をこのリポジトリが決めていることは、
 * [README](./README.md) の「ブラウザ側のシグナル」が持ちます。
 *
 * 送出されるのは metrics signal が有効なときだけです。無効なら OTel API が何もしない実装を返すので、
 * ここで有効・無効を判定しません。
 */
export function recordWebVital(vital: WebVital): void {
  histogramFor(vital.name).record(vital.value, {
    [ATTR_HTTP_ROUTE]: vital.route,
    "browser.web_vital.rating": vital.rating,
    "browser.web_vital.navigation_type": vital.navigationType,
  });
}

/** 指標に対応する計器を返す。同じ計器を測定のたびに作り直さない。 */
function histogramFor(name: Instrumented): Histogram {
  const existing = histograms.get(name);

  if (existing !== undefined) {
    return existing;
  }

  const { unit, description, boundaries } = INSTRUMENTS[name];
  const created = metrics
    .getMeter(SCOPE)
    .createHistogram(`browser.web_vital.${name.toLowerCase()}`, {
      unit,
      description,
      advice: { explicitBucketBoundaries: boundaries },
    });

  histograms.set(name, created);

  return created;
}
