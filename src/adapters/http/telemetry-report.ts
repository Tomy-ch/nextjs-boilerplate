/**
 * ブラウザ発のテレメトリを中継へ送るときの形。
 *
 * @remarks
 * `client/` と `server/` が同じ宣言を見るために、実行文脈を持たないここに置きます。検証は受け側が
 * 持ち、ここにあるのは型と、送る前に切り詰める長さだけです
 * （[adapters の README](../README.md) の「ブラウザ発のテレメトリの中継」）。
 */

/** 収集する Web Vitals の指標。 */
export type WebVitalName = "LCP" | "INP" | "CLS" | "FCP" | "TTFB" | "FID";

/** 指標 1 件の良し悪し。境界は web.dev が定める。 */
export type WebVitalRating = "good" | "needs-improvement" | "poor";

/** その測定がどの遷移で得られたか。 */
export type NavigationType =
  | "navigate"
  | "reload"
  | "back-forward"
  | "back-forward-cache"
  | "prerender"
  | "restore";

/** `route` に許す長さ。 */
export const MAX_ROUTE_LENGTH = 200;

/** 例外の分類名に許す長さ。 */
export const MAX_ERROR_NAME_LENGTH = 100;

/** 例外の文言に許す長さ。 */
export const MAX_ERROR_MESSAGE_LENGTH = 300;

/** 例外の stack に許す長さ。上位のフレームだけで発生源は辿れる。 */
export const MAX_ERROR_STACK_LENGTH = 2000;

/**
 * ブラウザが 1 回の中継で送る報告。
 *
 * @remarks
 * `route` に載せるのは実際のパスではなく **route の型**（`/products/[id]`）です。変換の理由と方法は
 * `toRoutePattern` が持ちます。
 *
 * 例外だけが `traceparent` を持ちます。**画面を組んだ要求の trace をサーバから受け取って返す**もので、
 * 紐づけの規則は `withRemoteTraceContext` が持ちます。Web Vitals は metric なので trace を持てません。
 */
export type TelemetryReport =
  | Readonly<{
      kind: "web-vital";
      route: string;
      name: WebVitalName;
      value: number;
      rating: WebVitalRating;
      navigationType: NavigationType;
    }>
  | Readonly<{
      kind: "error";
      route: string;
      name: string;
      message: string;
      stack?: string;
      traceparent?: string;
    }>;
