import { getGoBoilerplateAPIMock } from "./api/endpoints.msw";

/**
 * 契約から生成した MSW ハンドラ一式。
 *
 * @remarks
 * ハンドラを手書きしません。契約が変われば生成物が変わり、モックも一緒に動きます。手で足すと、
 * 契約とモックが別々に動き始め、モックが通るのに実際の API では通らない状態を作れてしまいます。
 *
 * mock が差し替えるのは API だけです。商品画像は配信元（`MEDIA_ORIGIN`）から実物を取得します。
 */
export const handlers = getGoBoilerplateAPIMock();
