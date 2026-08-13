/** 商品に紐づく分類。ID と表示名だけを持つ。 */
type ProductRef = {
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
  /**
   * 在庫が少ないと見なす境界。設定が無ければ null。
   *
   * 何個から「少ない」かはバックエンドが持つ運用の値であり、表示側で決めない。
   */
  stockWarningThreshold: number | null;
  status: ProductRef;
  category: ProductRef;
  /** 公開日時。未公開なら null。 */
  publishedAt: Date | null;
  /**
   * 配信基盤上のオブジェクトキー。表示 URL はここから組み立てる。
   *
   * 画像が無い商品は空配列になる。表示の順序は配列の順序に従う。
   */
  imagePaths: readonly string[];
};

/** cursor 方式で取得した商品の 1 ページ。 */
export type ProductPage = {
  products: readonly Product[];
  /** 次ページの取得に渡すカーソル。次が無ければ null。 */
  nextCursor: string | null;
};
