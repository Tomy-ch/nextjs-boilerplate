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
- **hook のテストは Vitest + React Testing Library の `render` / `act` を使う**。`test-requirement`
  は `unit` だが、React の hook API を内部で使うものは React のツリーを介してしか呼べないため、
  純粋ロジックと同じ手段では検証できない（選択基準は「対象が hook API を使うか」）
- 単一 feature 専用 hook は feature 内に置く
- **サーバに値が無い能力は、サーバ側の初期値を hook の doc に明記する**。初期値と実際の環境がずれる
  ぶんだけ hydration で表示が動くため、位置が動く出し分けには使わせない（CSS 側で表現する）

## 置いている hook

| hook | 供給する能力 |
| --- | --- |
| [`use-media-query`](use-media-query.ts) | 幅・入力方式などのメディア条件の一致 |
| [`use-scroll-direction`](use-scroll-direction.ts) | 直近の scroll がどちらへ向いたか |
| [`use-on-visible`](use-on-visible.ts) | 要素が見えたこと（`IntersectionObserver` の購読） |
