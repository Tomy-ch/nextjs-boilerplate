---
imports-allowed: [model, components, adapters, capabilities, stores, errors, logging]
forbidden: [features]
test-requirement: feature
---

# products

商品を探して眺めるための画面スライスです。

## 受け入れるもの

- 商品一覧の取得の編成（取得条件の解釈、画像 URL の解決、ページ送り）
- この画面専用の表示（一覧・カード・待機表示・失敗表示・検索欄・1 件の詳細）

## 受け入れないもの

- 他 feature への直接依存
- 汎用に使える表示（`Card` / `Badge` / `MediaImage` などは `components` から取る）
- 業務ロジック（在庫や価格の決定はバックエンドの領分）

## 構成

画面（`list` / `detail`）ごとに掘り、その中を性質で分けます（[0027](../../../docs/adr/0027-directory-structure.md)）。

| ファイル | 役割 |
| --- | --- |
| `list/product-list-page-content.tsx` | 一覧の取得と組み立て。待機表示の境界がここに掛かる |
| `list/product-query.ts` | URL の検索条件を取得条件へ直す |
| `list/ui/product-list/` | 並べる。空のときの案内も持つ |
| `list/ui/product-card/` | 1 件の見た目 |
| `list/ui/product-search/` | キーワード検索。URL を書き換える client island |
| `list/ui/product-pagination/` | cursor 方式のページ送り |
| `list/ui/product-list-skeleton/` | 待機表示 |
| `list/ui/product-list-error/` | 失敗表示 |
| `detail/product-detail-page-content.tsx` | 1 件の取得と組み立て。`not-found` の分類もここで受ける |
| `detail/ui/product-detail/` | 1 件の詳細の見た目。画像の carousel と説明文の描画を持つ |
| `detail/ui/add-to-cart-button/` | カートへ入れる操作。状態は `stores` が持つ |

## 運用

- **`components` へ上げないものの線引き**: 業務型（`Product`）と遷移先に依存する表示はここに置きます。
  在庫の見せ方はバックエンドの状態遷移に依存するため、`components` が供給できるのは `Badge` の
  variant までです
- **画像が無い商品には代替画像を置きます**。どの画像を代わりに置くかは対象の性質で決まるため、パスは
  この feature が持ち、`MediaImage` の `fallbackSrc` へ渡します
- **取得は page ではなくこの中で行います**。待機表示の境界を実際にデータを待つ部分の近くへ置くためで、
  page 全体を 1 つの待機表示で覆うと検索欄まで消えて操作できなくなります
- **検索条件は URL に置きます**。結果を共有でき、戻る操作で前の条件に戻り、再読み込みでも同じ画面が
  出ます。client state に持つとそのどれも成立しません
- **ページ送りは cursor 方式**です。番号付きのページ送りは作れません（総件数も任意ページへの飛び先も
  カーソルは持たないため）
