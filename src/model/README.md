---
imports-allowed: [errors]
forbidden: [fetch, config, business-logic]
test-requirement: unit
coverage-exclusions:
  - "src/model/generated/design-token.ts"
---

# model

表示用 Value Object、フォーマッタ、単位変換、表示バリデーション、表示結果型を置く純粋なカーネルです。

## 受け入れるもの

- 複数箇所から参照される表示上の値・変換・検証規則
- `ActionState<T>` など表示層の結果型
- **画面が送信の単位を決めるために作る値**。送信 1 回ぶんを指す冪等キーがこれで、値そのものは
  プロトコルの語彙だが、**いつ新しくするかを決めているのは画面**（開き直したら別の送信）である
  ため、`adapters` ではなくここが持つ

## 受け入れないもの

- バックエンドが所有する業務ルール、fetch、config、外部型の漏洩

## モジュール

| モジュール | 役割 |
| --- | --- |
| [`rich-text/`](rich-text/README.md) | リッチテキストの sanitize port。HTML 文字列を表示してよい範囲の木へ変換する |
| `breakpoint.ts` | 段に達していない幅の media query を組む。幅は design token が持つ |
| `datetime.ts` | 日時の locale 対応フォーマッタ |
| `locale.ts` | 既定 locale。フォーマッタが省略時に用いる単一の差し替え点 |
| `generated/breakpoint.ts` | 段の名前と幅。`tokens/` から生成する（手編集禁止） |
| `media.ts` | 配信基盤のオブジェクトキーから表示 URL を組み立てる |
| `pagination.ts` | cursor 方式の 1 ページを表す型と、増分取得での継ぎ足し |
| `action-state.ts` | Server Action が画面へ返す結果の器。項目エラー・フォームエラー・成功値 |
| `search-params.ts` | URL の同じキーが何回現れたかを値の意味へ直す規則。zod スキーマと組み合わせて使う |
| `idempotency-key.ts` | 変更 1 回ぶんを指す鍵と、それを載せるフォーム項目の名前 |
| `consent.ts` | 任意の用途に cookie を使ってよいかという意思と、その区分ごとのゲート述語 |
| `money.ts` | 最小単位の整数で持つ金額を、locale に沿った通貨表記へ整える |
| `cart/cart.ts` | サンプル画面が扱うカートの表示用の型 <!-- sample:line --> |
| `dashboard/dashboard.ts` | サンプル画面が扱う管理側の横断集計の表示用の型と、集計対象期間の語彙 <!-- sample:line --> |
| `product/product.ts` | サンプル画面が扱う商品の表示用の型 <!-- sample:line --> |
| `time-window.ts` | 集計・絞り込みが対象にする期間。暦の区分を、店のタイムゾーンで瞬時の半開区間へ写す |
| `purchase/purchase.ts` | サンプル画面が扱う購入履歴の表示用の型 <!-- sample:line --> |
| `purchase/purchase-status.ts` | サンプル画面が扱う購入ステータスの業務キー。分岐はこの値で行う <!-- sample:line --> |
| `user/` | サンプル画面が扱う利用者の表示用の型と、プロフィール入力の表示検証 <!-- sample:line --> |

## 運用

- 依存先は `errors` のみ
- ファイル名は kebab-case、型名は PascalCase、関数名は camelCase とする
