---
imports-allowed: [model, components, adapters, capabilities, stores, errors, logging]
forbidden: [features] # 相方の facade/ と、画面まるごとの story は例外 (ADR 0021)
test-requirement: feature
---

# purchases

成立した購入を後から読むための画面スライスです。一覧（`/purchases`）と 1 件の詳細（`/purchases/[id]`）を持ちます。

## 受け入れるもの

- 購入履歴の取得の編成と、増分取得（無限スクロール）の状態
- 期間の絞り込みを URL の条件として読み書きすること
- この画面専用の表示（履歴の行・期間の入力欄・控え・内訳・明細）

## 受け入れないもの

- 他 feature の内部への依存（商品一覧の URL は `products` の `facade/` から取る）
- 購入を作ること（`checkout` の領分）
- 金額の計算（小計・税・送料・合計はバックエンドが決めた値。[0070](../../../docs/adr/0070-backend-role-separation.md)）

## 構成

画面（`history` / `detail`）ごとに掘り、その中を性質で分けます（[0027](../../../docs/adr/0027-directory-structure.md)）。
どちらの画面にも属さないものは画面を挟まず直下へ置きます。

| ファイル | 役割 |
| --- | --- |
| `facade/paths/` | この feature が持つ 2 つのルート。マイページと購入完了（別 feature）の導線が参照する |
| `facade/receipt/` | 購入の控え（注文番号・注文日時・状況）。**購入完了も同じ形で出す** |
| `facade/lines/` | 結合済みの明細。**購入完了も同じ形で出す** |
| `facade/amount-summary/` | 請求額の内訳と円の参考換算額。**購入完了も同じ形で出す** |
| `facade/status-emphasis/` | ステータスの名称から badge の見た目を選ぶ。3 つに束ねる |
| `purchases.fixture.ts` | story とテストが使う固定の購入 |
| `history/query.ts` | 画面が受け取る素の条件と、ページ送りの寸法（件数・カーソルのキー） |
| `history/period.ts` | 期間の条件。URL のキー・読み取り・URL の組み立て・利用者への言い換え |
| `history/period-draft.ts` | 組み立て中の期間。入力欄が経由する途中の姿と、確定できるかの判定 |
| `history/page-content.tsx` | 条件の解釈と、画面と待機の境界の組み立て |
| `history/results.tsx` | 先頭ページの取得。期間が変わったときに取り直す範囲 |
| `history/use-infinite-purchases.ts` | 2 ページ目以降の取得と末尾到達の検知 |
| `history/view.tsx` | 一覧の画面。絞り込みと一覧本体を組む |
| `history/ui/infinite-list/` | 読み進められる一覧。取得と見た目をつなぐ |
| `history/filter-draft.tsx` | 組み立て中の期間の供給。幅で 2 か所に現れる入力欄を 1 つに保つ |
| `history/ui/period-fields/` | 期間の入力欄。区分と、その区分が使う入力欄。確定は持たない |
| `history/ui/period-bar/` | 帯の中に常設する絞り込み。一覧が隣に見えている幅で使う |
| `history/ui/period-sheet/` | 帯を常設できない幅の絞り込み。下端に固定した操作から overlay を開く |
| `history/ui/purchase-row/` | 履歴の 1 行。行そのものが詳細への行き先 |
| `history/ui/purchase-list/` | 読み進めた一覧の見た目。続きの状態は `LoadMore` が持つ |
| `history/ui/empty/` | 並べるものが無いときの表示 |
| `history/ui/skeleton/` | 一覧の待機表示 |
| `detail/page-content.tsx` | 1 件の取得。`not-found` の分類もここで受ける |
| `detail/view.tsx` | 詳細の画面。パンくずと `facade` の 3 つの塊を組む |

## 設計

- **絞り込みは必ずクエリでサーバへ渡します。** 取得済みのページに日付の条件を掛けると、条件に合う
  古い購入が落ちた一覧になります。読み込んであるのは新しいほうから数ページぶんでしかないためです
- **区分ごとの必須が欠けた条件は作れません。** 効いている条件は判別可能 union で持ち、入力欄が経由する
  途中の姿は別の型（`period-draft.ts`）に分けています（[0029](../../../docs/adr/0029-type-design-discipline.md)）
- **読めない条件は全期間へ倒します。** URL は利用者が直接編集できるので、必須の欠けた URL も届きます。
  そのまま契約へ渡すと一覧そのものが 400 になり、画面に何も出せません
- **ステータスの色は 3 つに束ねます。** 進行中 / 望ましい終端 / 取り消しで、これはバックエンドの
  状態遷移が持つ区別（終端かどうか、取り消しかどうか）そのものです。色は文言の補強でしかなく、
  badge は必ず名称を文字で持ちます
- **ステータスを名称で引くのは暫定です。** 本来の鍵は業務キー（バックエンドが `code` として持ち
  「外部公開のための業務キー」と定義しているもの）ですが、契約は `id` と `name` しか返しません。
  `id` はマスタの UUID なので焼き込めず、消去法で名称を鍵にしています。知らない名称は進行中へ倒すので、
  マスタが増えても色が付かないだけで一覧は読めます
- **条件が 1 つなので `FilterBar` を使いません。** あの組は条件が複数あることを前提に、効いている条件を
  chip で並べてまとめて解除する導線を持ちます。期間ひとつなら入力欄そのものが効いている条件の表示に
  なり、chip はその写しにしかなりません。overlay の中にあって入力欄が見えない幅では、開く操作の文言に
  効いている期間を出します
- **購入の表示は `facade` が持ちます。** 控え・明細・内訳は購入完了（`checkout`）も同じものを出します。
  同じ購入が画面によって違う見え方になると、控えとして突き合わせられません。`components` へ上げられない
  のは、いずれも題材の語彙（注文・購入）を持ち、コア残留の検査に弾かれるためです
  （[0021](../../../docs/adr/0021-frontend-responsibility.md)）
- **詳細は待機の状態を持ちません。** `loading.tsx` を置くと応答が streaming になり、存在しない
  購入でも 200 が返ります。取得の待ちは route が丸ごと引き受けるので、この画面に skeleton はありません。
  一覧のほうは Suspense の境界を持つので `history/ui/skeleton/` があります
- **増分取得の部品は商品一覧と共有です。** 続きの読み込みの状態は
  [`LoadMore`](../../components/app-starter/load-more/README.md)、目印が見えたことを知るのは
  [`use-on-visible`](../../capabilities/use-on-visible.ts) が持ちます。積み上げの状態機械だけが
  feature に残るのは、読み進めた位置を URL へ書き戻すかどうかも、積み直す契機も画面ごとに違うためです
