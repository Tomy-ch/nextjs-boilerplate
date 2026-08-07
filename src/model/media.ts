/**
 * バックエンドが返すオブジェクトキーから配信 URL を組み立てる。
 *
 * @remarks
 * API が返すのはキー（`products/{uuid}.png`）だけで、URL は返しません。配信元は環境ごとに
 * 変わるものであり、契約に焼き込むと環境の数だけ契約が要ることになるためです。
 *
 * 組み立てをこの 1 か所に閉じるのは、`origin + "/" + key` のような素朴な連結が、区切りの重複や
 * 欠落という形で画面ごとに現れるためです。`URL` に解決させれば、その揺れは構造的に無くなります。
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
