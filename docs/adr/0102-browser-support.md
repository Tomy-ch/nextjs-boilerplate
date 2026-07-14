# ブラウザサポート行列

サポート対象ブラウザの **基準(browserslist)/ polyfill 方針 / 切り捨て条件** を定める。

## Status

Accepted

（採番はブロック帯で確定(2026-07-14・0001〜0155。トピック順ブロック帯(10 番台=主題ブロック))([決定 5](../plan/pre-implementation-decisions.md))。本 ADR の内容自体はユーザ決定済み(Tier 5)。日付 2026-07-13。0.0.x の ADR は living document として本文を直接上書きし、改定履歴を積まない）

## 背景

BACKLOG C4 は、`browserslist` の固定・polyfill 方針・切り捨て条件を未決としていた。本 ADR は boilerplate 本体の既定を定める(厳格化 / 緩和は fork 先)。

## 決定

### 1. 基準 = Next.js の既定 browserslist を追認

- サポート対象は **Next.js が既定で用いる browserslist を追認**する(モダンブラウザ。Next.js 16 のトランスパイル / polyfill 既定に従う)。boilerplate 本体で独自の広い後方互換ターゲットを持たない
- fork 先が要件に応じて `browserslist`(または Next.js 設定)を上書きするのは妨げない

### 2. polyfill 方針

- **Next.js の既定 polyfill に委ねる**(必要な polyfill は Next.js がターゲットに応じて注入)。独自 polyfill を先回りで足さない([0011](0011-no-docker.md) の「用途未定」+ 必要になってから)

### 3. 切り捨て条件

- 具体的なサポート下限(レガシーブラウザの切り捨てライン)は**用途依存**のため fork 先で決める。boilerplate 本体はモダンブラウザ前提を既定とする

## 禁止事項

- ❌ boilerplate 本体で独自 polyfill / 広い後方互換ターゲットを先回りで足すこと(Next.js 既定に委ね、必要時 fork 先)

## 関連 ADR

- [0040-routing-rendering-strategy.md](0040-routing-rendering-strategy.md)(A4)— Next.js のビルド / トランスパイル前提
- [0011-no-docker.md](0011-no-docker.md) — 用途未定の表示層(切り捨て条件を fork 先に委ねる根拠)
- [0101-performance-budget.md](0101-performance-budget.md)(C3)— ターゲットとバンドル / パフォーマンスの交差
