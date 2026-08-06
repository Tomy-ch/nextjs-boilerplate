# <機能名>

<!-- feature を追加するとき、このファイルを src/features/<feature-name>/README.md へコピーして記入する。 -->

## 目的

<!-- ユーザーが達成できることと、この feature が担当する範囲を1〜3文で記す。 -->

## Route と契約

| 項目 | 内容 |
| --- | --- |
| Route | `<例: /products>` |
| operationId | `<例: listProducts>` |
| 認証 | `<不要 / 必要: 条件>` |
| 表示モデル | `<model の型名>` |

operationId が未確定、または API を使わない feature は理由を記す。

## 状態とデザイン参照

v1 では Storybook story をデザイン参照とする。各状態に対応する story を記す。

| 状態 | ユーザーに見せる内容 | Storybook story |
| --- | --- | --- |
| loading | `<skeleton 等>` | `<例: ProductList/Loading>` |
| empty | `<ゼロデータ時の案内>` | `<例: ProductList/Empty>` |
| error | `<再試行・復帰導線>` | `<例: ProductList/Error>` |
| success | `<通常表示>` | `<例: ProductList/Default>` |

部分失敗があり得る場合は、成功領域を残す表示と error story も追記する。

## 構成

| 置き場 | 責務 |
| --- | --- |
| `src/app/...` | route の driving adapter。feature を組み立てるだけで、業務判断を置かない。 |
| `src/features/<feature-name>/` | 画面固有の UI、action、表示用の組み立て。 |
| `src/adapters/` | API 呼び出し、生成型の変換、response 検証。 |
| `src/model/` | feature をまたいで共有する表示モデル。 |
| `src/components/` | 複数 feature で再利用する UI。 |

使用しない層は表から削除せず、`使用しない` と理由を記す。

## 依存カーネル

| カーネル | 用途 |
| --- | --- |
| `<例: adapters>` | `<例: 商品一覧を取得して表示モデルへ変換する>` |
| `<例: errors>` | `<例: 正規化済みの失敗を画面状態へ変換する>` |

`architecture.ts` と各カーネル README の import 境界に従う。generated API 型を feature / components へ渡さない。

## Action 戻り値契約

<!-- Server Action がない場合は「なし」と記す。 -->

| Action | 入力 | 戻り値 | 成功後の更新 | 失敗時の表示 |
| --- | --- | --- | --- |
| `<例: addToCart>` | `<FormData 等>` | `<ActionState<Cart>>` | `<revalidateTag 等>` | `<field error / toast 等>` |

mutation は二重送信を防ぎ、必要な場合は idempotency key を使う。

## テスト観点

- [ ] loading / empty / error / success の4状態
- [ ] API 正常系と正規化済みエラー
- [ ] 操作がある場合は二重送信・再試行・a11y
- [ ] adapter 境界では schema 不一致、timeout、5xx など該当する失敗
- [ ] Storybook story と実装の状態表が対応している

## Fork 時の変更点

<!-- backend 契約・デザイン・認証など、boilerplate 採用先で差し替える箇所を記す。なければ「なし」。 -->
