---
imports-allowed: []
forbidden: [http-vocabulary, external-dependencies]
test-requirement: unit
---

# errors

protocol-agnostic なエラー分類を置くカーネルです。全層から参照できます。

## 受け入れるもの

- sentinel 分類、cause chain、redaction、分類から code / message への変換

## 受け入れないもの

- HTTP 語彙、他カーネルへの依存

## 運用

- HTTP status からの変換は `adapters` 境界で一度だけ行う
- 4xx / 5xx のログレベル規約は errors の利用側が守る
