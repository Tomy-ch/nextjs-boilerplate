---
imports-allowed: [errors]
forbidden: [fetch, config, business-logic]
test-requirement: unit
---

# model

表示用 Value Object、フォーマッタ、単位変換、表示バリデーション、表示結果型を置く純粋なカーネルです。

## 受け入れるもの

- 複数箇所から参照される表示上の値・変換・検証規則
- `ActionState<T>` など表示層の結果型

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
| `product/product.ts` | サンプル画面が扱う商品の表示用の型 <!-- sample:line --> |

## 運用

- 依存先は `errors` のみ
- ファイル名は kebab-case、型名は PascalCase、関数名は camelCase とする
