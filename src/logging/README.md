---
imports-allowed: []
forbidden: [business-logic, direct-config-access]
test-requirement: unit
---

# logging

構造化ログを提供するカーネルです。設定値は import せず、呼び出し側から注入されます。

## 受け入れるもの

- context に基づく logger、`trace_id` の付与、構造化ログ、redaction

## 受け入れないもの

- 業務ロジック、config の直接参照

## 運用

- 出力先や有効化の設定は注入で受け取る
- ログに secret や個人情報を残さない
