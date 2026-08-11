---
imports-allowed: [model, errors, config]
forbidden: [adapters, components, capabilities, server-config, business-logic]
test-requirement: unit
---

# stores

複数 feature が共有する client 状態を置く client-only カーネルです。実装時の store は Zustand を用います。

## 受け入れるもの

- 選択状態、ウィザード、グローバル UI トグルなどの横断 client 状態

## 受け入れないもの

- server state、単一 feature の状態、UI マークアップ、secret、業務ロジック

<!-- sample:begin -->
## モジュール

| モジュール | 役割 |
| --- | --- |
| `cart-store.ts` | サンプル画面が共有するカートの中身 |

<!-- sample:end -->
## 運用

- client-only の実装では `"use client"` を最小の境界に置く
- 単一 feature の状態は feature 内の local state に留める
