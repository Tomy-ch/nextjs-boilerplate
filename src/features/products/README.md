---
imports-allowed: [model, components, adapters, capabilities, stores, errors, logging]
forbidden: [features] # 画面まるごとの story は例外 (ADR 0021)
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
| `list/page-content.tsx` | 一覧の取得と組み立て。待機表示の境界がここに掛かる |
| `list/query.ts` | URL の検索条件を取得条件へ直す |
| `list/view.tsx` | 一覧の表示。空のときの案内も持つ |
| `list/ui/card/` | 1 件の見た目 |
| `list/ui/search/` | キーワード検索。URL を書き換える client island |
| `list/ui/pagination/` | cursor 方式のページ送り |
| `list/ui/skeleton/` | 待機表示 |
| `list/ui/error-state/` | 失敗表示 |
| `detail/page-content.tsx` | 1 件の取得と組み立て。`not-found` の分類もここで受ける |
| `detail/view.tsx` | 1 件の詳細の表示。画像の carousel と説明文の描画を持つ |
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
- **カートへ入れる操作は、脇の領域が無い帯で画面下端に固定します**（[0051](../../../docs/adr/0051-styling-system.md)
  §2）。詳細は縦に長く、読み進めた位置から操作へ戻れなくなるためです。固定するかどうかは画面の
  組み立ての判断なので `detail/view.tsx` が持ち、操作の部品は自分がどこに置かれたかを知りません
- **バックエンドが長さを決める値は 1 行に収まる前提を置きません**。分類名や状態名は上限の宣言が無く、
  `Badge` は既定で折り返さないため、折り返しを呼び出し側で許します
- **ページ送りは cursor 方式**です。番号付きのページ送りは作れません（総件数も任意ページへの飛び先も
  カーソルは持たないため）
