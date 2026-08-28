import {
  MAX_ERROR_MESSAGE_LENGTH,
  MAX_ERROR_NAME_LENGTH,
  MAX_ERROR_STACK_LENGTH,
  type NavigationType,
  type TelemetryReport,
  type WebVitalName,
  type WebVitalRating,
} from "@/adapters/http/telemetry-report";

/** 中継の受け口。同一オリジンなので、送り先は設定に持たない。 */
const ENDPOINT = "/api/telemetry";

/**
 * ブラウザの計測器が渡してくる 1 件の測定。
 *
 * @remarks
 * `next/web-vitals` の型をそのまま受けません。ここが要るのは 4 つの値だけで、計測器の型を
 * 引き込むと、その型が変わるたびにこの境界が動きます。**綴りは契約の union で受けます** ——
 * 実行時に同じ表をもう 1 つ持つ代わりに、渡す側が型で外れます。
 */
export type WebVitalMeasurement = Readonly<{
  name: WebVitalName;
  value: number;
  rating: WebVitalRating;
  navigationType: NavigationType;
}>;

/**
 * 測定した Web Vitals を中継へ送る。
 *
 * @remarks
 * **綴りの検査はここでは持ちません。** 受け側が契約で弾くので、同じ表を送る側にも置くと、契約が
 * 動いたときに 2 か所を揃える必要が出ます。計測器が契約外の綴りを出したときは、受け側が 400 で
 * 落とします。
 *
 * @param measurement - 計測器が報告した 1 件
 * @param route - 測定した画面の route の型
 */
export function reportWebVital(measurement: WebVitalMeasurement, route: string): void {
  send({ kind: "web-vital", route, ...measurement });
}

/**
 * ブラウザで捕捉されなかった例外を中継へ送る。
 *
 * @remarks
 * 送るのは分類・文言・stack だけで、いずれも契約の長さへ切り詰めます。**上流から来た文言を
 * 精査はしません** —— 表現層が始末できるのは自分が組み立てた値で、他所が投げた文言の中身を
 * 網羅的に無害化することはできません。長さだけを保証し、送る項目を増やさないことで抑えます。
 *
 * @param error - `window` が報告した投げられた値。`Error` とは限らない
 * @param route - 例外が起きた画面の route の型
 * @param traceparent - 画面を組んだ要求の trace。器が受け取って渡す
 */
export function reportClientError(
  error: unknown,
  route: string,
  traceparent: string | undefined,
): void {
  const { name, message, stack } =
    error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : { name: "UnknownError", message: String(error), stack: undefined };

  send({
    kind: "error",
    route,
    name: name.slice(0, MAX_ERROR_NAME_LENGTH),
    message: message.slice(0, MAX_ERROR_MESSAGE_LENGTH),
    ...(stack === undefined ? {} : { stack: stack.slice(0, MAX_ERROR_STACK_LENGTH) }),
    ...(traceparent === undefined ? {} : { traceparent }),
  });
}

/**
 * 報告を中継へ渡す。
 *
 * @remarks
 * **`sendBeacon` を先に試します。** Web Vitals の多くは画面を離れる直前に確定するため、通常の
 * 取得では遷移で打ち切られます。`sendBeacon` は離脱後もブラウザが送り切ります。使えない実行では
 * `keepalive` を付けた取得へ落とします。
 *
 * 失敗は握り潰します。記録できないことで、記録の対象になった操作まで失敗させないためです。
 */
function send(report: TelemetryReport): void {
  const body = JSON.stringify(report);

  if (navigator.sendBeacon?.(ENDPOINT, new Blob([body], { type: "application/json" })) === true) {
    return;
  }

  void fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => undefined);
}
