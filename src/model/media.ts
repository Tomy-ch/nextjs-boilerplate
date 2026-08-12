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
 * API が返すのはキー（`products/{uuid}.png`）だけで、URL は返しません。
 *
 * @param origin - 配信元の origin。呼び出し側が設定から供給する
 * @param imagePath - バックエンドが返したオブジェクトキー。未設定なら null
 */
export function mediaUrl(origin: string, imagePath: string | null): string | null {
  if (imagePath === null || imagePath === "") {
    return null;
  }

  // 先頭の `/` を落としてから解決する。付いたままだと origin 直下の絶対パスとして扱われ、
  // 配信元がサブパスを持つ構成で経路が変わる。
  return new URL(imagePath.replace(/^\/+/, ""), `${origin.replace(/\/+$/, "")}/`).toString();
}
