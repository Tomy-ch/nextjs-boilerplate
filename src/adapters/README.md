---
imports-allowed: [model, errors, logging, config]
forbidden: [components, capabilities, stores, business-logic]
test-requirement: integration
---

# adapters

バックエンド API、BFF fetch、analytics など外部接続だけを置く境界アダプタです。`server/` と `client/` の 2 element に分けます。

## 受け入れるもの

- 外部 API / SDK への接続、外部型から表示用型への変換
- `server/` の secret を使う接続、`client/` のブラウザ向け接続

## 受け入れないもの

- 業務ロジック、UI、local browser API

## 運用

- `server/` は server config を利用でき、`client/` は secret を利用しない
- 外部型・生成型はここで変換し、内側へ漏らさない
