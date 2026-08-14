/**
 * 画面が扱う利用者自身の情報。
 *
 * @remarks
 * 契約の wire 型ではなく、表示のための型です。両者を分けるのは、契約の制約が表示の都合とは
 * 別の理由で動くためです（[0070](../../../docs/adr/0070-backend-role-separation.md)）。
 *
 * 削除日時は持ちません。自分の情報を引けている時点で退会していないため、画面が分岐する余地が
 * ありません。
 */
export type UserProfile = {
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly phone: string;
  readonly postalCode: string;
  /** 都道府県。契約が名前の文字列で持つため、識別子ではなく名前を送り返す。 */
  readonly prefecture: string;
  readonly city: string;
  readonly street: string;
  /** 建物名・部屋番号。入力は任意で、無ければ null。 */
  readonly building: string | null;
};

/**
 * 選べる都道府県。
 *
 * @remarks
 * `code` は落とします。JIS X 0401 の番号は並び順を決めるための値で、契約が `code` 昇順で返すと
 * 定めているため、受け取った順序がそのまま表示の順序になります。
 */
export type Prefecture = {
  readonly id: string;
  readonly name: string;
};

/**
 * 郵便番号から引いた住所の候補 1 件。
 *
 * @remarks
 * 都道府県の識別子は落とします。プロフィールが持つのは名前の文字列で、識別子を送り返す口が
 * ありません（[0070](../../../docs/adr/0070-backend-role-separation.md)）。
 */
export type AddressCandidate = {
  readonly prefecture: string;
  readonly city: string;
  /** 町域。番地から先は利用者が続けて入力する。 */
  readonly town: string;
};

/** 購入集計のステータス別内訳 1 件。 */
export type PurchaseStatusBreakdown = {
  readonly statusId: string;
  readonly statusName: string;
  readonly count: number;
  /** 当該ステータスの合計。最小単位の整数で持ち、表示の直前に主単位へ戻す。 */
  readonly totalAmount: number;
};

/**
 * 自分の購入の集計。
 *
 * @remarks
 * 総数と合計はキャンセル済みを含みます。内訳はキャンセルを 1 要素として持つため、除いた値が
 * 要るときは内訳から差し引けます。
 *
 * 内訳に並ぶのは購入に出現したステータスだけで、購入が 1 件も無ければ空になります。
 */
export type PurchaseSummary = {
  readonly totalCount: number;
  /** 合計。最小単位の整数で持ち、表示の直前に主単位へ戻す。 */
  readonly totalAmount: number;
  readonly breakdown: readonly PurchaseStatusBreakdown[];
};
