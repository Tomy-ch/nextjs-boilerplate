/**
 * cursor 方式で取得した 1 ページ。
 *
 * @remarks
 * 総件数もページ数も持ちません。cursor は「次の位置」を指すだけの不透明な値であり、全体が何件
 * あるかも、任意の位置へ跳ぶ手段も表現しないためです（[0073](../../docs/adr/0073-pagination-fetch-boundary.md)）。
 * 「全 N 件中 M 件」を出す一覧は、件数を返す別の取得経路を必要とします。
 *
 * 次ページの有無を真偽値で併せ持たないのは、`nextCursor` が `null` であることと同義になるためです。
 * 2 つ持つと、片方だけを見た実装と両方を見た実装が混在し、食い違ったときにどちらが正か決まりません。
 */
export type CursorPage<T> = {
  /** このページに含まれる要素。 */
  readonly items: readonly T[];
  /** 次ページの取得に渡すカーソル。次が無ければ null。 */
  readonly nextCursor: string | null;
};

/**
 * 読み込み済みのページに次のページを継ぎ足す。
 *
 * @remarks
 * 増分取得の一覧が積み上げた状態を作ります。継ぎ足した結果の `nextCursor` は常に後から来た側の
 * ものです。先頭側を残すと、同じページを取り直し続けて終端に到達しません。
 *
 * 要素の重複は取り除きません。cursor 方式は挿入・削除に対して境界が安定しているため、
 * 重複が出るのは取得元が cursor の約束を守っていない場合であり、それを表示層で吸収すると
 * 契約違反が見えなくなります。
 *
 * @param loaded - すでに読み込んであるページ
 * @param next - 継ぎ足すページ
 */
export function appendCursorPage<T>(loaded: CursorPage<T>, next: CursorPage<T>): CursorPage<T> {
  return {
    items: [...loaded.items, ...next.items],
    nextCursor: next.nextCursor,
  };
}
