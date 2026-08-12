---
imports-allowed: [model, errors, logging, config]
forbidden: [adapters, components, stores, server-config, business-state]
test-requirement: unit
---

# capabilities

connectivity、media query、storage、clipboard など、複数 feature が使うブラウザ runtime 能力の client hook を置くカーネルです。

## 受け入れるもの

- 横断利用される client-only hook と browser API の薄い抽象

## 受け入れないもの

- remote IO、server config、業務状態、UI、ポリシー状態

## 運用

- client-only の実装では `"use client"` を最小の境界に置く
- 単一 feature 専用 hook は feature 内に置く
- **サーバに値が無い能力は、サーバ側の初期値を hook の doc に明記する**。初期値と実際の環境がずれる
  ぶんだけ hydration で表示が動くため、位置が動く出し分けには使わせない（CSS 側で表現する）
