import { HttpHandler, HttpResponse } from "msw";

/**
 * 指し先の無い資源を表す識別子。
 *
 * @remarks
 * 契約駆動のモックはどの識別子にも応えるので、「見つからない」状態へは識別子を予約しないと
 * 届きません。この値をパスのパラメータ区間に持つ要求だけが 404 になります。正当な値と衝突する
 * 契約では、この値を変えます。
 */
export const ABSENT_IDENTIFIER = "absent";

/** パスがパラメータ区間（`/:name`）を持つか。scheme や port のコロンは区間ではない。 */
const PARAMETER_SEGMENT = /\/:[^/]/;

/**
 * 予約した識別子を持つ要求に 404 を返す口を、パラメータ区間を持つ口ごとに組み立てる。
 *
 * @remarks
 * **ハンドラ一式の前に差して使い、一式そのものには混ぜません。** 一式の顔ぶれと並びは契約と
 * 突き合わせて検査しており（[README](README.md)）、これは契約の口ではないためです。該当しない
 * 要求には何も返さないので、MSW は同じ口の契約のハンドラへ照合を進めます。
 *
 * **口は method とパスの組で写します。** 契約に無い method まで受けると、照合だけして応答の無い
 * 要求になり、未処理として落ちずに素通しされます。
 *
 * 404 の本文は持たせません。見つからないことは HTTP のステータスが運び、本文を組み立てると契約が
 * 宣言する形を手で写すことになります。
 *
 * @param handlers - 契約から組み立てたハンドラ一式
 * @returns パラメータ区間を持つ口 1 つにつき 1 つの口
 */
export function absentHandlers(handlers: readonly HttpHandler[]): HttpHandler[] {
  const endpoints = new Map(
    handlers
      .filter((handler) => PARAMETER_SEGMENT.test(String(handler.info.path)))
      .map((handler) => [`${String(handler.info.method)} ${String(handler.info.path)}`, handler]),
  );

  return [...endpoints.values()].map(
    (handler) =>
      new HttpHandler(handler.info.method, handler.info.path, ({ params }) =>
        Object.values(params).includes(ABSENT_IDENTIFIER)
          ? new HttpResponse(null, { status: 404 })
          : undefined,
      ),
  );
}
