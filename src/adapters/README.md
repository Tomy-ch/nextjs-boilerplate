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

- **`integration` の宣言が掛かるのは、外部との往復を持つモジュールです**。`fetch`（または注入された
  `fetchImpl`）を直接持つものが対象で、そこでは HTTP 境界だけを対象に、内側を mock して型と形を
  確かめます（[0090](../../docs/adr/0090-testing-strategy.md)）。**外部 IO を持たない純粋な変換**
  （`http/search-params.ts` / `http/retry-policy.ts` / `http/error-status.ts` など、境界の前後で値を
  写すだけのもの）は、その変換自体を `unit` の形——HTTP を模さず値を直接照合する——で検証します。
  境界を持たないものへ境界のテストを課しても、確かめる相手が無いためです

- `server/` は server config を利用でき、`client/` は secret を利用しない
- 外部型・生成型はここで変換し、内側へ漏らさない
