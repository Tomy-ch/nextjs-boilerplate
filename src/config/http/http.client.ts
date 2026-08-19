/**
 * 1 つの要求 URL に許すバイト数の上限。
 *
 * @remarks
 * `NEXT_PUBLIC_` はビルド時にリテラルへ置換されるため、静的なドット参照だけで読みます
 * ([0030](../../../../docs/adr/0030-environment-variable-management.md) §2)。分割代入や動的な
 * 参照は置換の対象にならず、ブラウザでは値が届きません。
 *
 * ここで検証はしません。全 ENV の検証はビルド時とサーバ起動時の 2 か所だけで行い、ブラウザには
 * 載せません（0030 §1）。置換されるのは検証を通った値そのものです。
 *
 * 上限の意味は server 側と同じです。同じ変数を両側が読むので、閾値の宣言は env の 1 行だけです。
 */
export const MAX_URL_BYTES: number = Number(process.env.NEXT_PUBLIC_HTTP_MAX_URL_BYTES);
