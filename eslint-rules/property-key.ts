/**
 * プロパティの鍵が名指している綴り。実行時にしか決まらない鍵なら `undefined`。
 *
 * @remarks
 * **リテラルの鍵は `[...]` で書かれていても綴りが確定する。** 綴りで一致を取る検査が
 * `["getBearerToken"]` を見逃すと、括弧を足すだけで規則を外せることになる。確定しないのは
 * `[識別子]` のように値が実行時に決まる鍵だけである。
 *
 * @param key - プロパティの鍵
 * @param computed - `[...]` で書かれた鍵か
 * @returns 名指している綴り
 */
export function spelledProperty(
  key: { type: string; value?: unknown; name?: string },
  computed: boolean,
): string | undefined {
  if (key.type === "Literal") {
    return typeof key.value === "string" ? key.value : undefined;
  }

  return !computed && key.type === "Identifier" ? key.name : undefined;
}
