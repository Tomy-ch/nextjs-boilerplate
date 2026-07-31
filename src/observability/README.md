---
imports-allowed: []
forbidden: [business-logic, direct-config-access]
test-requirement: unit
---

# observability

OTel を用いた trace と計測のためのカーネルです。設定値は import せず、起動側から注入されます。

## 受け入れるもの

- OTel SDK の初期化、trace、signal 別の有効化

## 受け入れないもの

- 業務ロジック、config の直接参照、特定 RUM SaaS への固定

## 運用

- OTLP と公式 semconv のみを使用する
- 実装時に設定値を注入し、vendor 固定を避ける
