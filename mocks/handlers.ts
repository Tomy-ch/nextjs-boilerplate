// sample:replace-begin
import { getGoBoilerplateAPIMock } from "./api/endpoints.msw";

/** 契約から生成したハンドラ 1 件。生成物は HTTP ハンドラだけを返す。 */
type GeneratedHandler = ReturnType<typeof getGoBoilerplateAPIMock>[number];

/**
 * パスが持つパラメータ区間の数。
 *
 * @remarks
 * 少ないほど具体的なパスです。`/x/latest` は 0、`/x/:id` は 1 で、前者は後者にも一致します。
 *
 * パスは常に文字列です。生成物は契約のパスをリテラルで渡すため、`RequestHandler` の union が
 * 持つ GraphQL 側（パスを持たない）の形は現れません。防御を足すと、到達しない分岐が残ります。
 */
function parameterCount(handler: GeneratedHandler): number {
  return (String(handler.info.path).match(/:/g) ?? []).length;
}
// sample:replace-with
// sample:replace-end

/**
 * 契約から生成した MSW ハンドラ一式。
 *
 * @remarks
 * ハンドラを手書きしません。契約が変われば生成物が変わり、モックも一緒に動きます。手で足すと、
 * 契約とモックが別々に動き始め、モックが通るのに実際の API では通らない状態を作れてしまいます。
 *
 * 並べ替えるのは、MSW が登録順に照合するためです。生成物の順序は契約のパス順なので、
 * パラメータ区間を持つパス（`/x/:id`）が、それにも一致する具体的なパス（`/x/latest`）より
 * 前に来ることがあります。その並びでは後者への要求が前者に食われ、別の応答が返ります。
 * 具体的なパスを先に置けば、パラメータ区間は他に一致するものが無かったときだけ拾います。
 * 並べ替えは安定なので、同じ具体度どうしの順序は生成物のままです。
 *
 * mock が差し替えるのは API だけです。画像は配信元（`MEDIA_ORIGIN`）から実物を取得します。
 */
// sample:replace-begin
export const handlers = [...getGoBoilerplateAPIMock()].sort(
  (left, right) => parameterCount(left) - parameterCount(right),
);
// sample:replace-with
// = export const handlers: never[] = [];
// sample:replace-end
