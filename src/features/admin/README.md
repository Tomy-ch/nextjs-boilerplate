---
imports-allowed: [model, components, adapters, capabilities, stores, errors, logging]
forbidden: [features] # 画面まるごとの story は例外 (ADR 0021)
test-requirement: feature
---

# admin

商品や利用者を管理する側の画面スライスです。

利用者向けのスライスと同じ対象を扱っても、**部品は共有しません**。買う側は 1 件を眺めて選び、
管理側は同じ属性を件どうしで見比べます。見せ方の要求が違うものを 1 つの部品にまとめると、
どちらかの都合がもう一方へ漏れます。

## 受け入れるもの

- 管理操作のための取得の編成（一覧の位置と検索語の解釈、ページ送りの URL の組み立て）
- この画面専用の表示（商品の表・検索欄・待機表示）

## 受け入れないもの

- 他 feature への直接依存
- 汎用に使える表示（`StaticDataTable` / `Badge` / `CursorPagination` などは `components` から取る）
- 認可の判定そのもの（役割の宣言は `model/authz`、確定認可は route の layout が持つ）

## 構成

画面ごとに掘り、その中を性質で分けます（[0027](../../../docs/adr/0027-directory-structure.md)）。

| ファイル | 役割 |
| --- | --- |
| `paths.ts` | 管理画面のパス。画面どうしの導線と、利用者向けの器からの入口が引く |
| `dashboard/period.ts` | 集計の URL 契約（期間の区分と両端の日付）。指定が成立しているかの判断も持つ |
| `dashboard/period-window.ts` | 選ばれた期間が対象にしている暦日。契約が返さないので同じ規則を辿る |
| `dashboard/count.ts` | 件数の locale 対応整形。2 つ目の feature が要る段で `model` へ上げる |
| `dashboard/summary-cards.ts` | 合成済みの集計を数値カードの並びへ写す。母集団の断りを値に添える |
| `dashboard/ranking-rows.ts` | 売れ筋の表に並べる 1 行。順位は契約が返した並びの位置 |
| `dashboard/page-content.tsx` | 入口（今日）の取得と組み立て |
| `dashboard/analytics-content.tsx` | 集計の URL 解釈と、取り直す範囲の区切り。取得は区画ごとに持つ |
| `dashboard/view.tsx` | 入口の画面。数値カードと内訳、期間指定への導線 |
| `dashboard/analytics-view.tsx` | 集計の画面。期間の選択の下へ、取り直す区画を slot で受ける |
| `dashboard/ui/stat-cards/` | 数値カードの並び。注記を値と同じ枠に置く |
| `dashboard/ui/status-chart/` | ステータス別件数の横棒。描画に実寸が要る client island |
| `dashboard/ui/status-breakdown/` | 横棒と数値表の併置。合計は出さない |
| `dashboard/ui/period-switch/` | 集計対象期間の選び直し。日付の要らない 2 つは link |
| `dashboard/ui/period-caption/` | いま出ている数がどの暦日の話かを添える |
| `dashboard/ui/range-dialog/` | 期間の両端を overlay で選ぶ。中身は native の GET フォーム |
| `dashboard/ui/ranking-table/` | 売れ筋の表。期間の選択には従わず、商品名は商品の面へ出る |
| `dashboard/ui/invalid-query/` | URL の期間が契約を外れているときの表示。外して戻る導線を持つ |
| `dashboard/ui/skeleton/` | 集計の待機表示 |
| `products/query.ts` | 一覧の URL 契約（絞り込みとページ送りの位置）。通ってきた道もここが持つ |
| `products/page-size.ts` | 1 ページに並べる件数 |
| `products/filter-option.ts` | 絞り込みで選べる候補の形と、マスタからの写し |
| `products/active-filters.ts` | いま効いている条件を、解除先付きの一覧へ写す |
| `products/row.ts` | 表に並べる 1 行の形。商品とマスタを突き合わせて状態の見た目を決める |
| `products/status-tone.ts` | 状態のコードと見た目の対応。契約が返さない意味づけをこの画面が持つ |
| `products/page-content.tsx` | URL の解釈と画面の組み立て。取り直す範囲をここで区切る |
| `products/results.tsx` | 1 ページ分の取得と、表・ページ送りの組み立て |
| `products/view.tsx` | 検索欄・絞り込み・効いている条件・作成への導線。一覧本体は受け取る |
| `products/ui/table/` | 商品の表。行ごとの操作は menu へ畳む |
| `products/ui/keyword-field/` | 商品名で探す入力欄。打鍵では検索せず、確定の操作で飛ばす |
| `products/ui/filter-control/` | 分類・状態の選択欄そのもの。選ばれた値をどう扱うかは持たない |
| `products/ui/filter-select/` | 選んだ時点で反映する絞り込み。広い段で使う |
| `products/ui/filter-sheet/` | 狭い段の絞り込み。下端の操作から開き、overlay の中でまとめて確定する |
| `products/ui/skeleton/` | 表の待機表示 |
| `products/ui/invalid-query/` | URL の条件が契約を外れているときの表示。外して戻る導線を持つ |
| `ui/error-state/` | 取得に失敗したときの表示。`/admin` の error 境界が使う。境界は 1 枚なので画面を名指ししない |

## 認可

この配下の画面はすべて `/admin` の下にあり、二段で守られます。

1. **前捌き** — `src/proxy.ts` が cookie の session だけを読み、役割が足りない要求を送り返す
2. **確定認可** — `src/app/admin/layout.tsx` が `verifySession()` を通し、役割を確かめる

どの経路に何の役割が要るかは [`src/model/authz.ts`](../../model/authz.ts) が持ちます。確定認可も、
利用者向けの器が admin への入口を出すかどうかも、同じ `isAdmin()` を引きます。判定が別々に書かれて
いると「入れないのに入口が出ている」状態を作れてしまいます（[0079](../../../docs/adr/0079-auth-frontend-seam.md)）。

**役割を持たない人には導線を出しません。** 押せる場所を作らないことが出し分けであり、押した先で
断る作りにすると、管理の面がある事実だけが誰にでも伝わります。

## 条件の検証と失敗

URL から読んだ条件は、**取得の口が持つ検証**（`adapters/server/api/products` の `parseProductQuery`）を
通してから渡します。画面側で数値化などの写しを作ると、契約を再生成しても写し方だけが古い範囲の
まま残ります（[0029](../../../docs/adr/0029-type-design-discipline.md)）。写せなかった条件は捨てず、
一覧の代わりにそのことを出します。

取得の失敗は `src/app/admin/error.tsx` が受けます。ここが無いと `global-error` まで抜け、脇の導線も
header も失われた素の画面になります（[0080](../../../docs/adr/0080-error-handling.md)）。

## 現契約でできないこと

`GET /v1/products` は**公開済みの商品だけ**を返します。未公開を含む管理一覧はバックエンドの契約
追加を要します。

商品の「状態」は在庫・販売の状態（在庫あり・在庫切れ・廃盤など）で、**公開の可否とは別の軸**です。
状態での絞り込みは現契約でそのまま効きます。
