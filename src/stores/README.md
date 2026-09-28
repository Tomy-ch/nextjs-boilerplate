---
imports-allowed: [model, errors, config] # 生成物。`pnpm gen:architecture` で直す
forbidden: [adapters, components, capabilities, server-config, business-logic]
test-requirement: unit
---

# stores

複数 feature が共有する client 状態を置く client-only カーネルです。実装時の store は Zustand を用います。

## 受け入れるもの

- 選択状態、ウィザード、グローバル UI トグルなどの横断 client 状態

## 受け入れないもの

- server state、単一 feature の状態、UI マークアップ、secret、業務ロジック

## モジュール

| モジュール | 役割 |
| --- | --- |
| `consent-store.ts` | 任意の用途に cookie を使ってよいかという意思。選んだ結果を cookie へ残し、その場でツリーへ反映する |

<!-- sample:begin -->
同梱のサンプルが加えるもの:

| モジュール | 役割 |
| --- | --- |
| `cart-store.ts` | サンプル画面が共有する「カートを開いているか」という要求 |

<!-- sample:end -->
## 運用

- client-only の実装では `"use client"` を最小の境界に置く
- 単一 feature の状態は feature 内の local state に留める

## 監査の観点

| 観点 | 判定の形 | 根拠 |
| --- | --- | --- |
| `forbidden: adapters` — `adapters` を import せず、`fetch` などの remote IO を持たない。server state は RSC と `adapters` が持つ | violation。import は機械が落とすので、ここで見るのはグローバルの `fetch` の呼び出し | [0023](../../docs/adr/0023-stores-kernel.md) 禁止事項。機械: ESLint boundaries |
| `forbidden: components` — UI 部品を import せず、UI マークアップを持たない | violation | [0023](../../docs/adr/0023-stores-kernel.md) 禁止事項。機械: ESLint boundaries と `project-rules/no-markup-outside-ui-layers` |
| `forbidden: capabilities` — `capabilities` を import しない | violation | [0021](../../docs/adr/0021-frontend-responsibility.md) 依存マトリクス。機械: ESLint boundaries |
| `forbidden: server-config` — server config（`*.server.ts`）を import せず、secret を持たない。`NEXT_PUBLIC_` の公開定数（`*.client.ts`）は読んでよい | violation | [0023](../../docs/adr/0023-stores-kernel.md) 禁止事項 / [0021](../../docs/adr/0021-frontend-responsibility.md) 依存マトリクス。ESLint は `config` を層の粒度でしか見ない |
| `forbidden: business-logic` — 業務ロジックを持たない。持つのは横断する client 状態とその更新だけ | violation。状態の更新か業務の判定かが読み分けられないときは suggestion | [0023](../../docs/adr/0023-stores-kernel.md) 禁止事項 |
| API の応答を store へ写して二重にキャッシュしない。選択の記録に含む表示値のスナップショットはこれに当たらない | suggestion（鮮度の責任を誰が持つかは store の型から決まらない） | [0023](../../docs/adr/0023-stores-kernel.md) 禁止事項 |
| 置いてある store は複数の feature から使われる | import する feature スライスが 2 つ未満なら suggestion | [0023](../../docs/adr/0023-stores-kernel.md) 禁止事項 / この README「運用」 |
| Zustand のストアを `src/stores/` の外で作らない | violation | [0023](../../docs/adr/0023-stores-kernel.md) 禁止事項 |

## 関連する ADR

- [0021](../../docs/adr/0021-frontend-responsibility.md) — 層の責務と import 境界
- [0023](../../docs/adr/0023-stores-kernel.md) — このカーネルが受け持つ横断 client 状態と、server state の写しを置かない線
- [0031](../../docs/adr/0031-policy-state-supply.md) — 同意などポリシー状態の供給の形
- [0041](../../docs/adr/0041-cache-components-decision.md) — Cache Components の下での hydration。サーバとブラウザで同じ初期値を返す制約
- [0060](../../docs/adr/0060-state-management.md) — Zustand の採用と、server state をどこが持つか
