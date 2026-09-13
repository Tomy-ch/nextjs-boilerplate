/** 冪等キーを載せるフォーム項目の名前。 */
export const IDEMPOTENCY_KEY_FIELD = "idempotencyKey";

/** RFC 9562 が variant に許す 4 つの値。上位 2 bit が `10` になる並び。 */
const VARIANT_NIBBLES = "89ab";

/**
 * 変更 1 回ぶんの冪等キーを作る。
 *
 * @remarks
 * **画面を組み立てるたびに 1 つ作ります。** 同じ画面から何度送っても同じ鍵になるため、二重に
 * 押しても再読み込みで送り直しても、成立する変更は 1 つのままです。逆に、画面を開き直したときは
 * 別の鍵になります。もう一度やる意思で開いた画面が、前回の再生になっては困るためです。
 *
 * **受け取った側は mount のときの値を持ち続けます。** 引き下げての再取得（`router.refresh()`）は
 * 器を unmount せず prop だけを差し替えるため、渡された値をそのまま送ると、書きかけの入力は
 * 残ったまま鍵だけが新しくなります。応答が届かなかった送信をやり直したときに、1 回目と別の鍵で
 * 飛び、再送検知が効きません。
 *
 * 鍵の役割はバックエンドの再送検知だけで、推測されて困る値ではありません。ここで作れるのは、
 * 送信の単位を決めているのが画面だからです。
 *
 * **`crypto.randomUUID` は使えません。** WebCrypto がこれを secure context にだけ出すため、
 * https でも localhost でもない出所（LAN の確認用、docker のホスト名など）で開いた画面では
 * 関数ごと存在せず、描画のさなかに落ちます。どの文脈にも出る `getRandomValues` から組みます。
 *
 * **版と variant の桁は乱数のままにできません。** 送信を解く側が UUID として検証するため、
 * RFC 9562 が固定している 2 桁を外すと、画面が作った鍵をサーバが弾きます。
 */
export function newIdempotencyKey(): string {
  const hex = Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  const variant = VARIANT_NIBBLES.charAt(
    Number.parseInt(hex.charAt(16), 16) % VARIANT_NIBBLES.length,
  );

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20)}`;
}
