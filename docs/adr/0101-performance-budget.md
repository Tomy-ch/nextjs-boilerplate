# パフォーマンス予算

パフォーマンスの **計測指標(Core Web Vitals)/ 予算の仕組み(Lighthouse・bundle size)/ 具体閾値の所在** を定める。boilerplate は**仕組みの枠**を定め、**具体閾値は用途依存として fork 先 / 実装 PR** に委ねる。

## Status

Accepted

（採番はブロック帯で確定(2026-07-14・0001〜0155。トピック順ブロック帯(10 番台=主題ブロック))([0140](0140-documentation-operations.md))。本 ADR の内容自体はユーザ決定済み(Tier 5)。日付 2026-07-13。0.0.x の ADR は living document として本文を直接上書きし、改定履歴を積まない）

## 背景

BACKLOG C3 は、Core Web Vitals SLO・Lighthouse 閾値・bundle size 予算・計測の仕組みを未決としていた。**具体的な予算値は用途(コンテンツ量・対象デバイス・SLA)に強く依存**するため、boilerplate 本体で一律の数値を強制しない。本 ADR は指標と仕組みの枠を定める。

## 決定

### 1. 計測指標 = Core Web Vitals

- パフォーマンスの一次指標は **Core Web Vitals(LCP / INP / CLS)** とする(業界標準)。lab 計測(CI Lighthouse)に対する **field 値(RUM)の収集経路は [0082](0082-client-observability.md) が定める**(INP 等は実ユーザ操作を要するため field 側で補完)

### 2. 予算の仕組み(枠のみ・数値は委譲)

- **Lighthouse / bundle size 予算を CI で計測する仕組みを持つ**。CI への組込みは **B9([0153](0153-ci-configuration.md))** の枠(job 分割 / PR コメント upsert 基盤)に従い、具体ツールと計測 job の追加は**実装 PR で確定**する([0153](0153-ci-configuration.md) は現時点で計測 job を定義していない)。計測はするが、**閾値でのハードゲート化 / 具体数値は fork 先 / 実装 PR で設定**する
- bundle size は Next.js のビルド出力(route ごとのサイズ)を可視化する。`NEXT_PUBLIC_` の表面積最小化([0030](0030-environment-variable-management.md))・`"use client"` 境界の葉押し下げ([0040](0040-routing-rendering-strategy.md))が bundle を抑える構造的土台

### 3. 具体閾値の所在

- Core Web Vitals SLO・Lighthouse スコア閾値・bundle size 上限の**具体値は本 ADR で固定しない**(用途依存)。fork 先がプロジェクト要件に応じて設定し、設定した値は CI ゲート(B9)に載せる

## 禁止事項

- ❌ 用途を問わない固定 SLO 数値を boilerplate 本体で強制すること(閾値は fork 先判断)
- ❌ 計測の仕組み自体を持たないこと(数値は委譲するが、計測の枠は持つ)

## 関連 ADR

- [0153-ci-configuration.md](0153-ci-configuration.md)(B9)— Lighthouse / bundle 計測の CI 組込み先(job 分割 / PR コメント基盤。計測 job 自体は実装 PR で追加)
- [0082-client-observability.md](0082-client-observability.md)— CWV の field 値(RUM)収集経路を補完(lab の Lighthouse では INP 等を計測できないため)
- [0040-routing-rendering-strategy.md](0040-routing-rendering-strategy.md)(A4)— `"use client"` 葉押し下げ(bundle 抑制の土台)
- [0030-environment-variable-management.md](0030-environment-variable-management.md)(A7)— `NEXT_PUBLIC_` 表面積最小化
- [0050-styling-strategy.md](0050-styling-strategy.md)(B1)— Tailwind(CSS サイズの土台)
