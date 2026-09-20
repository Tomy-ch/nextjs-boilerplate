/**
 * `use cache` の宣言を読む述語。
 *
 * 2 つの規則（`no-user-scoped-in-cached-module` / `no-cache-option-in-use-cache`）が同じ判定を
 * 要るため、ここが 1 か所で持つ。profile の綴りが増えたときに、片方だけが古くなることを避ける。
 */

/** `use cache` と、profile を伴う綴り。 */
const CACHE_DIRECTIVE_PATTERN = /^use cache(?::\s*([\w-]+))?$/;

/** サーバへ保存しないキャッシュの profile。 */
const CLIENT_ONLY_CACHE_PROFILE = "private";

/**
 * サーバへ保存されるキャッシュの宣言か。
 *
 * @param value - 式文に置かれた文字列。
 * @returns `use cache` であり、かつ client にしか残らない profile でなければ `true`。
 */
export function isServerCacheDirective(value: string): boolean {
  const match = CACHE_DIRECTIVE_PATTERN.exec(value);

  return match !== null && match[1] !== CLIENT_ONLY_CACHE_PROFILE;
}
