---
imports-allowed: [model, errors, logging, config, observability]
forbidden: [components, capabilities, stores, business-logic]
test-requirement: unit
---

# telemetry

ブラウザ発のシグナルを組み立てて中継へ送る面と、ブラウザ側の計装です。

## 親と違う点

**検証の要求が親と違います。** `adapters` の宣言は `integration` ですが、それが掛かるのは
`fetch`（または注入された `fetchImpl`）を**直接持つ**モジュールです（[README](../../README.md) の
「運用」）。ここに置くものはどれもそれを持ちません —— 報告の送信は `sendBeacon` で、要求を span に
するのは OTel の計装であって、このディレクトリのコードは組み立てと登録だけを持ちます。

**判定は「そのモジュールが外へ出るか」で行い、ディレクトリの位置では決めません。**

| モジュール | 検証 | 理由 |
| --- | --- | --- |
| [`report-telemetry.ts`](report-telemetry.ts) | `unit` | 報告を組み、`sendBeacon` へ渡す |
| [`route-pattern.ts`](route-pattern.ts) | `unit` | パスから route の型を復元する |
| [`browser-tracer.ts`](browser-tracer.ts) | `unit` | OTel の provider と計装を組み立てて登録する。実送信は SDK が持つ |

## 受け入れるもの

- 報告の組み立てと送信、ブラウザ側の計装の立ち上げ

## 受け入れないもの

- 業務ロジック、受け側の検証（`server/telemetry/` が持つ）
