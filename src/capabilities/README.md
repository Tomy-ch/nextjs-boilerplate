---
imports-allowed: [model, errors, logging, config] # 生成物。`pnpm gen:architecture` で直す
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

## 監査の観点

| 観点 | 判定の形 | 根拠 |
| --- | --- | --- |
| `forbidden: adapters` — `adapters` を import せず、`fetch` などの remote IO を持たない | violation。import と購読の組み立て（`EventSource` / `WebSocket`）は機械が落とすので、ここで見るのはグローバルの `fetch` の呼び出し | [0022](../../docs/adr/0022-capabilities-kernel.md) 禁止事項。機械: ESLint boundaries と `no-restricted-syntax` |
| `forbidden: components` — UI 部品を import しない | violation | [0021](../../docs/adr/0021-frontend-responsibility.md) 依存マトリクス。機械: ESLint boundaries |
| `forbidden: stores` — `stores` を import しない | violation | [0021](../../docs/adr/0021-frontend-responsibility.md) 依存マトリクス。機械: ESLint boundaries |
| `forbidden: server-config` — server config（`*.server.ts`）を import しない。`NEXT_PUBLIC_` の公開定数（`*.client.ts`）は読んでよい | violation | [0022](../../docs/adr/0022-capabilities-kernel.md) 禁止事項 / [0021](../../docs/adr/0021-frontend-responsibility.md) 依存マトリクス。ESLint は `config` を層の粒度でしか見ない |
| `forbidden: business-state` — 業務状態、同意や feature flag のようなポリシー状態、購読の生死や backoff のような通信機構の状態を持たない。持つのはブラウザ runtime の能力だけ | 業務状態は violation。状態がポリシーや通信機構の写しかどうかが読み分けられないときは suggestion | [0022](../../docs/adr/0022-capabilities-kernel.md) 禁止事項 |
| 置いてある hook は複数の feature から使われる。1 つの feature 専用の hook は feature の内側に置く | 使う feature が 1 つしか無ければ suggestion | [0022](../../docs/adr/0022-capabilities-kernel.md) / この README「運用」 |
| サーバに値が無い能力は、サーバ側の初期値を hook の doc に書く | 書かれていなければ violation | この README「運用」 |

## 関連する ADR

- [0021](../../docs/adr/0021-frontend-responsibility.md) — 層の責務と import 境界
- [0022](../../docs/adr/0022-capabilities-kernel.md) — このカーネルが受け持つ範囲と、単一 feature 用の hook を昇格させない線
- [0040](../../docs/adr/0040-routing-rendering-strategy.md) — Server / Client Component の割り方と `"use client"` の置き場
- [0090](../../docs/adr/0090-testing-strategy.md) — 層ごとのテストの受け持ちと co-location
