// カタログが配信するサンプル資材の URL。実体は `../public/`（[README](../public/README.md)）。
//
// ルート絶対で書くのは、カタログの設定（`../main.ts` の `staticDirs`）が置き場ごと配信の根へ
// 写すためである。指し先が story 側の位置に依らないので、部品の実装ディレクトリを動かしても
// 壊れない。

/** 利用者の顔として出す絵。 */
export const SAMPLE_AVATAR_URL = "/sample-avatar.svg";

/** 添付されたファイルの縮小版として出す絵。 */
export const SAMPLE_DOCUMENT_URL = "/sample-document.svg";

/**
 * 絵そのものが主題ではない場所へ置く絵。
 *
 * @remarks
 * 3 柄あるのは、**送った位置が変わったことを絵柄の違いでしか示せない部品がある**ためです
 * （`ImageViewer` / 品目の詳細）。1 枚で足りる場所は先頭を使います。
 */
export const SAMPLE_ITEM_URLS = [
  "/sample-item-1.svg",
  "/sample-item-2.svg",
  "/sample-item-3.svg",
] as const;
