import { z } from "zod";

import type { CursorPage } from "../pagination";

/**
 * 商品の識別子を確定させるスキーマ。
 *
 * @remarks
 * 生成スキーマの中で組み合わせる呼び出しがこれを直接使い、それ以外は {@link toProductId} を
 * 通します（[0029](../../../docs/adr/0029-type-design-discipline.md) §3）。
 */
export const productIdSchema = z.string().brand<"product">();

/**
 * 商品を指す識別子。
 *
 * @remarks
 * 素の `string` を代入できない形にしてあります。商品・利用者・購入の識別子はいずれも UUID の
 * 文字列で、取り違えても型では止まらないためです
 * （[0029](../../../docs/adr/0029-type-design-discipline.md) §3）。
 */
export type ProductId = z.infer<typeof productIdSchema>;

/**
 * 文字列を商品の識別子として確定させる。
 *
 * @remarks
 * **呼んでよいのは境界だけ**です。外から来た値を確定させる場所（`adapters` の検証の出口・
 * フォームの受け取り・route の動的セグメント）で 1 度だけ通し、内側では確定した型を持ち回ります。
 *
 * 実在するかは検査しません。識別子を知っているのはバックエンドであり、存在しない値は取得が
 * `not-found` として返します（[0070](../../../docs/adr/0070-backend-role-separation.md)）。
 * ここが担うのは、どの種類の識別子かを型に載せることだけです。
 */
export function toProductId(value: string): ProductId {
  return productIdSchema.parse(value);
}

/** 商品に紐づく分類。ID と表示名だけを持つ。 */
export type ProductRef = {
  id: string;
  name: string;
};

/**
 * 分類のマスタ 1 件。
 *
 * @remarks
 * 商品に紐づく {@link ProductRef} と分けてあります。マスタだけが `code` を持ち、絞り込みは
 * この番号で行うためです。商品の側に載る分類は表示のための参照で、番号を持ちません。
 */
export type ProductCategory = ProductRef & {
  /** マスタ行を指す静的な番号。UUID と違い、絞り込みの条件として URL に載せられる。 */
  code: number;
};

/**
 * 画面が扱う商品。
 *
 * @remarks
 * 契約の wire 型ではなく、表示のための型です。両者を分けるのは、契約の制約が表示の都合とは
 * 別の理由で動くためです（[0070](../../../docs/adr/0070-backend-role-separation.md)）。
 */
export type Product = {
  id: ProductId;
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
   * 画像が無い商品は空配列になる。表示の順序は配列の順序に従う。**枚数で分岐しない** —
   * 契約は常に配列で返し、0 枚も 1 枚も複数枚も同じ形で届く。
   */
  imagePaths: readonly string[];
};

/** cursor 方式で取得した商品の 1 ページ。 */
export type ProductPage = CursorPage<Product>;

/**
 * 一覧に並べる 1 件分の表示データ。
 *
 * @remarks
 * {@link Product} をそのまま並べないのは、一覧が増分取得で JSON を跨ぐためです。`Date` も
 * `undefined` も JSON では往復せず、跨いだ先で型どおりに扱うと実際には文字列が入っています。
 * 一覧に要るものだけを素の値で持つ形にして、往復しても壊れないことを型で示します。
 *
 * 画像は URL まで解決した状態で持ちます。オブジェクトキーから URL を組むには配信元の設定が
 * 要り、設定を読めるのは `adapters` までだからです（[0021](../../../docs/adr/0021-frontend-responsibility.md)）。
 */
export type ProductListItem = {
  readonly id: ProductId;
  readonly name: string;
  /** USD の decimal 文字列。表示の直前まで数値へ変換しない。 */
  readonly price: string;
  readonly quantity: number;
  readonly categoryName: string;
  readonly statusName: string;
  /**
   * 一覧に出す画像の表示 URL。画像が無ければ null。
   *
   * 商品は画像を複数持つが、一覧は 1 件を 1 枚で表すため**先頭の 1 枚だけ**を採る。
   * どれを代表とするかは契約の順序（`displaySort` 昇順）が決めており、選び直さない。
   */
  readonly imageUrl: string | null;
};

/**
 * 売上ランキングに並ぶ 1 件分の表示データ。
 *
 * @remarks
 * {@link ProductListItem} と別の型にしているのは、ランキングの取得口が画像も分類も在庫も
 * 返さないためです。同じ型へ寄せると、一覧では必ずある値がランキングでは常に欠けている形に
 * なり、受け取る側が「この画面ではどれが入っているか」を毎回確かめることになります。
 */
export type ProductRankingEntry = {
  readonly productId: ProductId;
  readonly name: string;
  /** USD の decimal 文字列。表示の直前まで数値へ変換しない。 */
  readonly price: string;
  /** 集計期間内の販売数量。キャンセル済みの購入を除いた合算値。 */
  readonly soldQuantity: number;
};
