/**
 * `eslint-plugin-security` の型宣言。
 *
 * @remarks
 * 上流は型を同梱せず、`@types/eslint-plugin-security` も存在しません。`eslint.config.ts` は
 * `plugins:` に値を 1 つ載せるだけで、プラグインの中身へは触れないため、必要な型はこの
 * 1 行に尽きます。形を詳しく写しても、上流の実装が変わったときに黙ってずれる宣言が増える
 * だけになります。
 */
declare module "eslint-plugin-security" {
  const plugin: { rules: Record<string, unknown> };
  export default plugin;
}
