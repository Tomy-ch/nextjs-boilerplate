/**
 * 階層を持たない画面のための slot。
 *
 * @remarks
 * **`default.tsx` があっても、この route ごとの slot は要ります。** 画面を跨いで移ると、slot に
 * 対応する route を持たない画面では**直前の slot がそのまま残り**ます。既定へ戻るのは読み込み
 * 直したときだけなので、置かないと登録を終えて一覧へ送られた先に「新規作成」の階層が残ります。
 */
export default function AdminAnalyticsBreadcrumb() {
  return null;
}
