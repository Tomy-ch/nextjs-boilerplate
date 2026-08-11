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
| `datetime.ts` | 日時の locale 対応フォーマッタ |
| `locale.ts` | 既定 locale。フォーマッタが省略時に用いる単一の差し替え点 |
| `media.ts` | 配信基盤のオブジェクトキーから表示 URL を組み立てる |
| `product/product.ts` | サンプル画面が扱う商品の表示用の型 <!-- sample:line --> |

## 運用

- 依存先は `errors` のみ
- ファイル名は kebab-case、型名は PascalCase、関数名は camelCase とする
