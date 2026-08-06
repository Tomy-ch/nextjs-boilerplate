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

## 運用

- 依存先は `errors` のみ
- ファイル名は kebab-case、型名は PascalCase、関数名は camelCase とする
