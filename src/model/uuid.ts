/** RFC 9562 が variant に許す 4 つの値。上位 2 bit が `10` になる並び。 */
const VARIANT_NIBBLES = "89ab";

/** 時刻が占める先頭の桁数。RFC 9562 が版 7 に定める 48 bit を、16 進で表した長さ。 */
const TIMESTAMP_LENGTH = 12;

/**
 * 画面が作る一意な値を 1 つ返す。RFC 9562 の版 7。
 *
 * @remarks
 * **`crypto.randomUUID` は使えません。** WebCrypto がこれを secure context にだけ出すため、
 * https でも localhost でもない出所（LAN 越しの確認、docker のホスト名など）で開いた画面には
 * 関数ごと存在せず、呼んだところで落ちます。どの文脈にも出る `getRandomValues` から組みます。
 *
 * **版と variant の桁は乱数のままにできません。** 受け取る側が UUID として検証するため、
 * RFC 9562 が固定している 2 桁を外すと、画面が作った値をその検証が弾きます。
 *
 * 版 7 を選ぶのは、先頭に時刻が入って**作った順に並ぶ**ためです。同じミリ秒に作っても、
 * 残りの 74 bit が乱数なので別の値になります。
 */
export function newUuid(): string {
  const time = Date.now().toString(16).padStart(TIMESTAMP_LENGTH, "0");
  const hex = Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  const variant = VARIANT_NIBBLES.charAt(
    Number.parseInt(hex.charAt(16), 16) % VARIANT_NIBBLES.length,
  );

  return `${time.slice(0, 8)}-${time.slice(8)}-7${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20)}`;
}
