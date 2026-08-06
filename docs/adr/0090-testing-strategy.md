# テスト戦略

テストの **フレームワーク選定 / 層別責務 / 命名・配置 / カバレッジゲート / 二層実行 / mock 戦略** を定める。戦略面は go-boilerplate の実証済みテスト規約を翻案し(設計フェーズでユーザ承認済み)、フレームワークは Next.js / React エコシステムの標準を採る。

## Status

Accepted

（採番はブロック帯で確定(2026-07-14・0001〜0155。トピック順ブロック帯(10 番台=主題ブロック))([0140](0140-documentation-operations.md))。本 ADR の内容自体はユーザ決定済み。日付 2026-07-12。0.0.x の ADR は living document として本文を直接上書きし、改定履歴を積まない。**実装中に不都合が出たら補正する前提**）

## 背景

AGENTS.md の `[TODO] Testing Strategy` は、フレームワーク選定・層別責務・カバレッジ・配置命名・Server Components のテスト方針を未決とし、暫定運用として「テストフレームワークを勝手に `package.json` に足さない / 必要になったら ADR 化を提案」を敷いていた。本 ADR がその ADR 化であり、設計フェーズで確定した戦略とフレームワークを成文化する。

戦略(何をどう検証するか)は go-boilerplate の `docs/testing-conventions.md` に実証済みの規約があり、それを翻案する(ユーザ承認済み)。フレームワークは Next.js / React の標準に従う。

## 決定

### フレームワーク: Vitest + RTL + MSW + Playwright

- **Vitest**(ユニット / コンポーネント)+ **React Testing Library**(コンポーネント)+ **MSW**(HTTP 境界の mock)+ **Playwright**(E2E)を採用する
- 選定根拠: [0004](0004-library-management.md) の基準(メンテ活発・エコシステム標準)から実質一意。本体・主要ツールは exact pin + `pnpm audit`([0004](0004-library-management.md))

### 戦略(go-boilerplate 規約の翻案)

- **co-location**: テストは実装の隣に置く([0027](0027-directory-structure.md))。`__tests__/` への一括集約はしない
- **命名**: テストケースは **`正常系` / `異常系` の日本語命名**(振る舞い + 分岐条件を日本語で述べる)。最外グループは `正常系` / `異常系` のリテラル、内側にケースをネスト(AGENTS.md「テスト `describe` / `it` 文字列は日本語」と接続)
- **table-driven 禁止**: `for` ループでケースを回さず、**sequential な sibling**(1 ケース 1 記述)で書く
- **1 対象 1 テスト**: 関数 / メソッドごとにテストを対応させる

### 層別責務

| 層 | 対象 | ツール |
| --- | --- | --- |
| unit | 純粋ロジック(`model` / feature 内純関数) | Vitest |
| component | UI コンポーネントの描画・振る舞い | Vitest + RTL |
| integration | **HTTP 境界のみ**(`adapters` の API クライアント / route handler の境界) | Vitest + MSW |
| e2e | ブラウザ経路の通し | Playwright |

- **integration = HTTP 境界のみ**を対象とし、**内側は mock**、**型 / 形状をアサート**する(値の正しさは unit で担保。go 規約の翻案)
- **Server Components のテスト方針 / RSC・route handler・E2E の線引き**は、Next.js の現実に合わせて**実装時に確定**する(本 ADR で先取りしない)

### カバレッジゲート

- **カバレッジ 100% のハードゲート**とする。除外は glob で管理し、**カバレッジ例外は所有パッケージ(層 / feature)の README に記録 + 承認**を要する(超法規的措置の統治。go 規約の翻案)
- カバレッジの **PR レポート**を出す。具体的なレポートツール(go の octocov 相当)と CI 組込みは **[0153](0153-ci-configuration.md)(CI 構成)** の責務として引き渡す

### 二層実行

- **CI = 厳格(キャッシュ無効)**、**pre-commit / ローカル = 高速(キャッシュ有効)** の二層で実行する(速い hook + 権威 CI の二重化。[0151](0151-git-hooks.md) と同型)。lefthook / CI への接続は [0151](0151-git-hooks.md) / [0153](0153-ci-configuration.md) で行う

### mock 戦略

- **HTTP 境界の mock は MSW**、**モジュール境界の差し替えは `vi.mock`** を用いる。手書き mock は最小化する(go の「gomock 生成物を使い手書き禁止」を、TS の `vi.mock` / MSW へ翻案)
- config の差し替えは env スタブ + factory 再生成([0030](0030-environment-variable-management.md))。env スタブの具体 API は Vitest の **`vi.stubEnv`** とし、[0030](0030-environment-variable-management.md) が先取りを避けて引き渡していた「B8 で確定」を本 ADR が引き取る

### 配置・命名

- テストファイルは実装の隣に co-location([0027](0027-directory-structure.md))。ファイル名の本体部分は **kebab-case + `.test.ts(x)`**([0028](0028-naming-convention.md) の統一方針に従う。例: `format-date.test.ts`)
- `describe` / `it` 文字列は上記のとおり日本語(`正常系` / `異常系`)

## 禁止事項

- ❌ テストを `__tests__/` へ一括集約すること(実装の隣に co-location)
- ❌ table-driven(`for` ループでのケース列挙)。sequential sibling で書く
- ❌ integration で HTTP 境界の内側まで実結合すること(内側は mock、型 / 形状アサート)
- ❌ カバレッジ除外を README 記録・承認なしに増やすこと
- ❌ フレームワーク・テスト関連依存を exact pin / `pnpm audit` なしに追加すること([0004](0004-library-management.md))

## 補足

- 本 ADR の Accepted に伴い、AGENTS.md の `[TODO] Testing Strategy` 節の削除・書き換えを実施する(未実施 — AGENTS.md は Protected Documentation のため、変更案の提示とユーザ承認を経て適用する)
- テストフレームワーク導入 + `make test-full` / `test-cached` 二層 + lefthook 接続 + カバレッジゲート CI は P3-6 で実装する。GB-5(scaffold-test / test-review スキル)移植と既存 skill の検証手順更新は P4-0 で行う
- **実装中に不都合が出たら本 ADR を補正する**

## 関連 ADR

- [0027-directory-structure.md](0027-directory-structure.md) — テストの co-location(実装の隣 / `__tests__` 集約否定)
- [0028-naming-convention.md](0028-naming-convention.md) — テストファイル名(kebab-case + `.test.ts`)
- [0040-routing-rendering-strategy.md](0040-routing-rendering-strategy.md) — Server Components / route handler(テスト線引きの対象)
- [0030-environment-variable-management.md](0030-environment-variable-management.md) — env スタブ + factory 再生成(本 ADR が具体 API を確定)
- [0004-library-management.md](0004-library-management.md) — テスト依存の exact pin / audit
- [0151-git-hooks.md](0151-git-hooks.md) — 二層実行(速い hook + 権威 CI)の接続先
- [0153](0153-ci-configuration.md)(CI 構成)— カバレッジ PR レポートツール・CI 組込みの確定先
