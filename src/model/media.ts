/**
 * 画像を持たない対象に代わりに置く、アプリ同梱の画像。
 *
 * @remarks
 * 配信基盤ではなく `public/` に置いています。画像が無いことを伝える表示は、配信基盤に到達できない
 * ときでも出せる必要があるためです。
 */
export const NO_IMAGE_URL = "/no-image.svg";

/**
 * バックエンドが返すオブジェクトキーから配信 URL を組み立てる。
 *
 * @remarks
 * API が返すのはキー（`items/{uuid}.png`）だけで、URL は返しません。
 *
 * **組み立てた URL は必ず配信元の下に収まります。** キーは検証されないまま届く値であり、`data:` の
 * ように自分でスキームを持つ値は、そのまま渡すと配信元を素通りして画像の中身ごと差し替わります
 * （`next/image` はスキームを持つ値を最適化の経路から外すため、許可した配信元の検査も通りません）。
 * 収まらない値は代替画像へ倒すために null を返します。
 *
 * @param origin - 配信元の origin。呼び出し側が設定から供給する
 * @param imagePath - バックエンドが返したオブジェクトキー。未設定なら null
 * @returns 配信元の下に収まる URL。キーが無い・配信元の外を指す・URL として解釈できない場合は null
 */
export function mediaUrl(origin: string, imagePath: string | null): string | null {
  if (imagePath === null || imagePath === "") {
    return null;
  }

  // 配信元も URL として持つ。文字列のまま前方一致を見ると、host の大小や既定ポートの有無で
  // 正規化が片側にだけ効き、実在するキーまで外と判定される。
  const base = new URL(`${origin.replace(/\/+$/, "")}/`);

  let resolved: URL;

  try {
    // 先頭の `/` を落としてから解決する。付いたままだと origin 直下の絶対パスとして扱われ、
    // 配信元がサブパスを持つ構成で経路が変わる。
    resolved = new URL(imagePath.replace(/^\/+/, ""), base);
  } catch {
    return null;
  }

  return resolved.href.startsWith(base.href) ? resolved.href : null;
}
