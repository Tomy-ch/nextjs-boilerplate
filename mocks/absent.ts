import { type HttpHandler, HttpResponse, http } from "msw";

/**
 * 指し先の無い資源を表す識別子。
 *
 * @remarks
 * 契約駆動のモックはどの識別子にも応えるので、「見つからない」状態へは識別子を予約しないと
 * 届きません。この値をパスの区間に持つ要求だけが 404 になります。
 */
export const ABSENT_IDENTIFIER = "absent";

/**
 * 予約した識別子を持つ要求に 404 を返す口を、パラメータ区間を持つパスごとに組み立てる。
 *
 * @remarks
 * **ハンドラ一式の前に差して使い、一式そのものには混ぜません。** 一式の顔ぶれと並びは契約と
 * 突き合わせて検査しており（[README](README.md)）、これは契約の口ではないためです。該当しない
 * 要求には何も返さないので、MSW は次のハンドラへ照合を進めます。
 *
 * 404 の本文は持たせません。見つからないことはステータスが運び、本文を組み立てると契約に無い形を
 * 手で書くことになります。
 *
 * @param handlers - 契約から組み立てたハンドラ一式
 * @returns パラメータ区間を持つパス 1 つにつき 1 つの口
 */
export function absentHandlers(handlers: readonly HttpHandler[]): HttpHandler[] {
  const paths = new Set(
    handlers.map((handler) => String(handler.info.path)).filter((path) => path.includes(":")),
  );

  return [...paths].map((path) =>
    http.all(path, ({ params }) =>
      Object.values(params).includes(ABSENT_IDENTIFIER)
        ? new HttpResponse(null, { status: 404 })
        : undefined,
    ),
  );
}
