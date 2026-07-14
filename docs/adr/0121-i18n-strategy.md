# i18n 戦略(exclusion)

国際化(i18n)ライブラリ・ロケール解決・翻訳キー設計を **boilerplate 本体に同梱しない** ことを意図的な除外(exclusion)として記録し、fork 先が採用する場合の App Router 上の seam のみ示す。

## Status

Accepted (exclusion)

（採番はブロック帯で確定(2026-07-14・0001〜0155。トピック順ブロック帯(10 番台=主題ブロック))([決定 5](../plan/pre-implementation-decisions.md))。本 ADR の内容自体はユーザ決定済み(Tier 5 = 用途依存の判断)。日付 2026-07-13。0.0.x の ADR は living document として本文を直接上書きし、改定履歴を積まない）

**v2 採用予定(局所ライブラリ・2026-07-14)**: 本 exclusion 本体は不変。採用マトリクス([adoption-matrix.md](../plan/adoption-matrix.md))で i18n は **v2 = 局所ライブラリ採用**(用途依存)に振り分けられた。**seam(`proxy.ts` / `[locale]`)は 0.0.x/v1 で敷済・ライブラリ採用は v2**(next-intl・Thin = seam + 一部使用)。採用時も本体は seam を保持し、next-intl を [0010](0010-standards-and-non-lockin.md)(vendor-independent 正当化 + adapters/カーネル境界の裏で差替可能・vendor 直参照を feature/component に散らさない)/ [0004](0004-library-management.md)(exact-pin / `pnpm audit`)の枠内で置く。

## 背景

BACKLOG C1 は、next-intl 等の採否・ロケール解決責務・翻訳キー設計を未決としていた。i18n は**必要ロケール・翻訳運用が用途に強く依存**するため、boilerplate 本体で一律に決めると fork 先の選択を狭める。go-boilerplate はバックエンドであり翻案元がない(フロント固有)。

## 決定: boilerplate 本体に同梱しない(fork 先判断)

- **i18n ライブラリ(next-intl 等)・ロケール解決・翻訳キー体系を boilerplate 本体に同梱しない**。用途依存のため fork 先で必要になった時点で判断する(exclusion)
- 導出根拠: [0011](0011-no-docker.md) の「用途未定の表示層」ロール + BACKLOG out of scope 原則([0052](0052-ui-component-policy.md) / [0060](0060-state-management.md) と同じ fork 先判断の論理)
- **fork 先が i18n を採用する場合の seam**(参考): App Router のロケール解決は **`proxy.ts`(Next.js 16 の旧 Middleware。ロケール検出・リダイレクト。[0043](0043-middleware-policy.md))** と **route セグメント(`[locale]`。[0040](0040-routing-rendering-strategy.md) / [0028](0028-naming-convention.md))** で行うのが Next.js 慣行。導入時も [0021](0021-frontend-responsibility.md)(カーネル配置・命名規律)・[0004](0004-library-management.md)(exact pin / audit)の枠内で行う

## exclusion の扱い

- 本 ADR は「意図的にやらない」判断の記録である([決定 5](../plan/pre-implementation-decisions.md) タクソノミー: exclusion = ADR)。fork 先が導入する分にはこの exclusion は障害にならない

## 関連 ADR

- [0011-no-docker.md](0011-no-docker.md) — 用途未定の表示層ロール(fork 先判断の根拠)
- [0043-middleware-policy.md](0043-middleware-policy.md)(C6)/ [0040-routing-rendering-strategy.md](0040-routing-rendering-strategy.md)(A4)— ロケール解決の seam(採用時)
- [0052-ui-component-policy.md](0052-ui-component-policy.md) / [0060-state-management.md](0060-state-management.md) — 同じ fork 先判断の exclusion 先例
