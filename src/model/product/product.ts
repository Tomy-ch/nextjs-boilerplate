/** 商品に紐づく分類。ID と表示名だけを持つ。 */
export type ProductRef = {
  id: string;
  name: string;
};

/**
 * 画面が扱う商品。
 *
 * @remarks
 * 契約の wire 型ではなく、表示のための型です。両者を分けるのは、契約の制約が表示の都合とは
 * 別の理由で動くためです（[0070](../../../docs/adr/0070-backend-role-separation.md)）。
 */
export type Product = {
  id: string;
  name: string;
  /** 商品説明。リッチテキストであり、表示側は必ず sanitizer を通す。 */
  description: string | null;
  /**
   * 価格。USD の decimal 文字列のまま持つ。
   *
   * 数値へ変換しないのは、JSON number が IEEE754 double として復元され、サブセント精度を
   * 失うためである。丸めの判断は表示の直前に行う。
   */
  price: string;
  quantity: number;
  status: ProductRef;
  category: ProductRef;
  /** 公開日時。未公開なら null。 */
  publishedAt: Date | null;
  /** 配信基盤上のオブジェクトキー。表示 URL はここから組み立てる。 */
  imagePath: string | null;
};

/** cursor 方式で取得した商品の 1 ページ。 */
export type ProductPage = {
  products: readonly Product[];
  /** 次ページの取得に渡すカーソル。次が無ければ null。 */
  nextCursor: string | null;
};
