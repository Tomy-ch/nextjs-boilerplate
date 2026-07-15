# アクセシビリティ目標

アクセシビリティの **目標水準(WCAG)/ 静的検査(biome a11y)/ 手動チェックのタイミング** を定める。

## Status

Accepted

（採番はブロック帯で確定(2026-07-14・0001〜0155。トピック順ブロック帯(10 番台=主題ブロック))([決定 5](../plan/pre-implementation-decisions.md))。本 ADR の内容自体はユーザ決定済み(Tier 5)。日付 2026-07-13。0.0.x の ADR は living document として本文を直接上書きし、改定履歴を積まない）

## 背景

BACKLOG C2 は、WCAG レベル・biome a11y ルールの活用・手動チェックのタイミングを未決としていた。本 ADR は boilerplate 本体が満たす**最小の a11y 方針**を定める(用途依存で厳格化するのは fork 先)。

## 決定

### 1. 目標水準 = WCAG 2.x AA

- boilerplate が目指す水準は **WCAG 2.x レベル AA**(業界標準の既定水準)。fork 先が要件に応じて AAA へ引き上げるのは妨げない

### 2. 静的検査 = biome の a11y ルール

- **biome の a11y ルール群を活用**する([0002](0002-formatter-linter.md)。biome は静的 a11y lint を担う)。`lint:ci`([0002](0002-formatter-linter.md)。完全版プロファイルは未導入 = 実装 PR で導入)で CI 強制する予定
- 実行時 DOM の ARIA 整合・コントラスト実測等の**自動検査**は [0091](0091-test-verification-methods.md) が採用した axe(`vitest-axe` / `@axe-core/playwright`)が担う(biome は静的 lint、axe は実行時 DOM 検査という役割分担)
- 手動チェックは、それらで機械化できない体験面(スクリーンリーダー体験等)に限定する

### 3. 手動チェックのタイミング

- キーボード操作 / フォーカス順序 / スクリーンリーダー確認は、**UI を伴う feature の実装 PR 時**に行う(自動化できない体験面の観点)。ARIA 整合・コントラスト実測等の機械化できる範囲は axe([0091](0091-test-verification-methods.md))/ E2E([0090](0090-testing-strategy.md) Playwright)で機械化する
- セマンティック HTML を既定とし、`components`([0021](0021-frontend-responsibility.md))の純 UI がアクセシブルであることを土台にする

## 禁止事項

- ❌ biome の a11y ルールを理由なく無効化すること([0002](0002-formatter-linter.md) の biome-ignore 濫用禁止)
- ❌ a11y を「後から対応」として feature 実装から切り離すこと(実装 PR 時に担保)

## 関連 ADR

- [0002-formatter-linter.md](0002-formatter-linter.md) — biome a11y ルール(静的検査の手段)
- [0021-frontend-responsibility.md](0021-frontend-responsibility.md) — `components` 純 UI(アクセシブルの土台)
- [0091-test-verification-methods.md](0091-test-verification-methods.md) — 実行時 a11y 自動検査 = axe(`vitest-axe` / `@axe-core/playwright`)の組込(本 ADR の自動検査手段)
- [0090-testing-strategy.md](0090-testing-strategy.md) — E2E(機械化できる a11y 確認)
- [0050-styling-strategy.md](0050-styling-strategy.md) — Tailwind(コントラスト等 design token と接続)
