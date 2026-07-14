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

- **biome の a11y ルール群を活用**する([0002](0002-formatter-linter.md)。biome は a11y 検査を既に持つため追加ツールを入れない)。`lint:ci`([0002](0002-formatter-linter.md))で CI 強制する
- biome で表現できない意味的な a11y 検査(スクリーンリーダー体験・コントラスト実測等)はツールで代替せず、下記の手動チェックで担保する

### 3. 手動チェックのタイミング

- キーボード操作 / フォーカス順序 / コントラスト / スクリーンリーダー確認は、**UI を伴う feature の実装 PR 時**に行う(自動化できない観点。E2E([0090](0090-testing-strategy.md) Playwright)で機械化できる範囲は機械化してよい)
- セマンティック HTML を既定とし、`components`([0021](0021-frontend-responsibility.md))の純 UI がアクセシブルであることを土台にする

## 禁止事項

- ❌ biome の a11y ルールを理由なく無効化すること([0002](0002-formatter-linter.md) の biome-ignore 濫用禁止)
- ❌ a11y を「後から対応」として feature 実装から切り離すこと(実装 PR 時に担保)

## 関連 ADR

- [0002-formatter-linter.md](0002-formatter-linter.md) — biome a11y ルール(静的検査の手段)
- [0021-frontend-responsibility.md](0021-frontend-responsibility.md) — `components` 純 UI(アクセシブルの土台)
- [0090-testing-strategy.md](0090-testing-strategy.md) — E2E(機械化できる a11y 確認)
- [0050-styling-strategy.md](0050-styling-strategy.md) — Tailwind(コントラスト等 design token と接続)
