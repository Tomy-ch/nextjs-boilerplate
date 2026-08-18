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
| `purchases.fixture.ts` | story とテストが使う固定の購入 |
| `history/period.ts` | 期間の条件。URL のキー・読み取り・URL の組み立て・利用者への言い換え |
| `history/period-draft.ts` | 組み立て中の期間。入力欄が経由する途中の姿と、確定できるかの判定 |
| `history/view.tsx` | 一覧の画面。絞り込みと一覧本体を組む |
| `history/ui/period-filter/` | 期間で絞る操作。区分と、その区分が使う入力欄 |
| `history/ui/purchase-row/` | 履歴の 1 行。行そのものが詳細への行き先 |
| `history/ui/purchase-list/` | 読み進めた一覧の見た目。取得中・末尾到達・失敗を描き分ける |
| `history/ui/empty/` | 並べるものが無いときの表示 |
| `history/ui/skeleton/` | 一覧の待機表示 |
| `detail/view.tsx` | 詳細の画面。パンくずと 3 つの塊を組む |
| `detail/ui/receipt/` | 購入の控え（注文番号・注文日時・状況） |
| `detail/ui/amount-summary/` | 請求額の内訳と、円の参考換算額の切り替え |
| `detail/ui/lines/` | 結合済みの明細 |
| `detail/ui/skeleton/` | 詳細の待機表示 |

## 設計

- **絞り込みは必ずクエリでサーバへ渡します。** 取得済みのページに日付の条件を掛けると、条件に合う
  古い購入が落ちた一覧になります。読み込んであるのは新しいほうから数ページぶんでしかないためです
- **区分ごとの必須が欠けた条件は作れません。** 効いている条件は判別可能 union で持ち、入力欄が経由する
  途中の姿は別の型（`period-draft.ts`）に分けています（[0029](../../../docs/adr/0029-type-design-discipline.md)）
- **読めない条件は全期間へ倒します。** URL は利用者が直接編集できるので、必須の欠けた URL も届きます。
  そのまま契約へ渡すと一覧そのものが 400 になり、画面に何も出せません
- **続きを読む操作は失敗したときだけ出します。** 読み進めている間は末尾に近づくだけで次が始まるため、
  同じことをする入口を並べても選ぶ手数が増えるだけです
