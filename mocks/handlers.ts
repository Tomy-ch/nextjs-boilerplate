// sample:replace-begin
import * as generated from "./api/endpoints.msw";
import { REFERENCE_PATCHES } from "./references";
import { stableHandlers } from "./stable-responses";

/** 契約から生成したハンドラ 1 件。生成物は HTTP ハンドラだけを返す。 */
type GeneratedHandler = ReturnType<typeof stableHandlers>[number];

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

// sample:replace-begin
/**
 * 契約から生成した MSW ハンドラ一式。
 *
 * @remarks
 * 手書きしない理由と、[stable-responses](stable-responses.ts) に通す組み立ての中身は
 * [README](README.md) が持ちます。
 *
 * **ここが持つのは並べ替えだけです。** MSW は登録順に照合するので、パラメータ区間を持つパス
 * （`/x/:id`）が、それにも一致する具体的なパス（`/x/latest`）より前に来ると、後者への要求が
 * 前者に食われて別の応答が返ります。具体的なパスを先に置けば、パラメータ区間は他に一致する
 * ものが無かったときだけ拾います。同じ具体度どうしは、並べ替えが安定なので
 * [stable-responses](stable-responses.ts) が返した並びのままです。
 */
export const handlers = stableHandlers(generated, REFERENCE_PATCHES).sort(
  (left, right) => parameterCount(left) - parameterCount(right),
);
// sample:replace-with
// = /**
// =  * 契約から生成した MSW ハンドラ一式。
// =  *
// =  * @remarks
// =  * 空なのは契約をまだ置いていないためです。`make gen-api` が生成物を出したら、それを
// =  * [stable-responses](stable-responses.ts) に通したものをここが返します（[README](README.md)）。
// =  */
// = export const handlers: never[] = [];
// sample:replace-end
