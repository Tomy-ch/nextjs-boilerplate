# ADR Backlog

本プロジェクトの ADR 全体像と、各 ADR の **選定済み / 実装済み** の進捗を、**カテゴリ別** に追跡する。

`README.md` は Accepted な ADR の公式インデックス、本ファイルは「全カテゴリの全 ADR の状態を一元で見るボード」と役割を分ける。

## 運用ルール

- ADR は **カテゴリ (Tier) で分類** する。Tier 番号はステータスではなく、領域 + 大まかな依存順を表す。Accepted になっても Tier 間の移動はしない
  - 例外: 低い Tier 番号が、領域として優先度の高いものを並べる目的の場合、ツール層 (Tier 1) を「道具」として使う依存が逆向きに発生し得る。具体的には Tier 0 (Git運用) の G1 / G2 が Tier 1 (ツールチェーン) の T1〜T4 に依存している。Tier 番号は完全な依存トポロジーではなく、運用・領域上の優先度を表す指標として読む
- 各項目は **選定済み / 実装済み** の 2 軸でステータスを追跡する (詳細は凡例を参照)
- 依存関係を踏まえた順で着手する (依存マップ参照)
- 新しい意思決定領域に気付いたら、該当 Tier への追加 → 内容合意 → ADR 化 のフローを踏む。ADR ファイルへの直接追加から始めない
- 枠 ID (`G1` / `T1` / `A1` 等) は本 BACKLOG 内の識別子。Tier ごとに letter prefix を割り当てる:
  - **G** = Git運用 (Tier 0)
  - **T** = Tooling / ビルド・依存 (Tier 1)
  - **R** = Role / 配送 (Tier 2)
  - **A** = Architecture (Tier 3)
  - **B** = 実装方針 (Tier 4)
  - **C** = Compat / 機能・互換 (Tier 5)
  - **D** = Docs / ドキュメント (Tier 6)
- 公式の **ADR 番号** (`0001`-`9999`) はファイル化のタイミングで採番し、`ADR #` 列に記録する。BACKLOG 内の依存参照は枠 ID で行う
- **2 軸の意味**:
  - **選定済み**: ADR ファイルが書かれて Status = Accepted になっているか
  - **実装済み**: 方針を実行するための仕組み (config / artifact / コード) がリポジトリに存在するか

## 凡例

- ✅ 完了
- ⚠️ 部分実装 (de facto は揃っているが規約として未確定 / 一部のみ / 部分違反あり)
- ⬜ 未着手

---

## Tier 0: Git運用 / プロセス

ブランチ戦略 / コミット規約 / PR 運用 / リリース運用 / Git hook 等、開発プロセスを支えるルール。

| 枠 ID | ADR # | タイトル | 選定済み | 実装済み | 依存 | 内容要旨 |
| --- | --- | --- | --- | --- | --- | --- |
| **G1** | Dev-0002 | git-workflow | ✅ | ✅ | T1, T4 | ブランチ戦略 / コミット規約 (Feat/Fix/...) / PR 運用 / リリース運用 (`make tag-*`) |
| **G2** | Toolchain-0006 | git-hooks | ✅ | ⬜ | T2, T4, G1 | pre-commit / pre-push を lefthook で運用 / 速い hook + 権威 CI の二重化 |

### Tier 0 の実装ギャップ

- **G2 (Toolchain-0006)**: `.lefthook.yaml` / lefthook の devDependency 追加ともに未着手

---

## Tier 1: ビルド・依存・ツールチェーン

パッケージマネージャ / フォーマッタ / バージョンマネージャ / 依存方針 等、開発環境を構成する基盤ツール。

| 枠 ID | ADR # | タイトル | 選定済み | 実装済み | 依存 | 内容要旨 |
| --- | --- | --- | --- | --- | --- | --- |
| **T1** | 0001 | package-manager (pnpm) | ✅ | ✅ | — | パッケージマネージャに pnpm を採用 / lockfile commit 必須 / npm・yarn 禁止 |
| **T2** | 0002 | formatter-linter (biome) | ✅ | ✅ | T1 | フォーマッタ・リンタを biome に 1 本化 / ESLint・Prettier 不採用 / VSCode 連携 |
| **T3** | 0003 | version-manager (mise) | ✅ | ✅ | T1 | ツール・言語バージョンの SSOT に `mise.toml` を採用 / 配送層への mise 拡張禁止 |
| **T4** | Toolchain-0005 | library-management | ✅ | ⚠️ | T1 | npm 依存の選定・固定・更新・監査メタ方針 / コア依存は exact pin / メジャー更新は別 PR |

### Tier 1 の実装ギャップ

- **T4 (Toolchain-0005)**: `package.json` で `typescript: "^5"` が caret 指定。Toolchain-0005 の「主要 dev ツール = exact pin」に違反 (`@biomejs/biome` は exact pin で整合)。また PR テンプレートに ADR 記載の「ライブラリ採用チェック」テンプレが未組込

---

## Tier 2: 配送・ロール定義

デプロイ先の前提 / アプリケーションの役割 / 同梱しないもの 等、リポジトリ全体のスコープを規定する判断。

| 枠 ID | ADR # | タイトル | 選定済み | 実装済み | 依存 | 内容要旨 |
| --- | --- | --- | --- | --- | --- | --- |
| **R1** | 0004 | no-docker (表示層ロール定義) | ✅ | ✅ | T1, T3, T4 | Next.js を「表示層」として定義 / アプリ本体 Docker 不採用 / dev 補助 docker-compose は例外 |

---

## Tier 3: アーキテクチャ基盤

採用アーキテクチャ / 責務分離 / ルーティング・レンダリング / ディレクトリ構造 / 命名規則 / 環境変数 等、コード構造の前提を作る決定。**A1 → A2 → A3 → A4 → A5 → A6 → A7** の依存順で着手する。

| 枠 ID | ADR # | タイトル | 選定済み | 実装済み | 依存 | 内容要旨 |
| --- | --- | --- | --- | --- | --- | --- |
| **A1** | — | 採用アーキテクチャ | ⬜ | ⬜ | — | 全体パターン (feature-sliced / layered / vertical slice 等) の宣言 / 設計原則 / 採用しないパターン |
| **A2** | — | バックエンドとの役割分離 | ⬜ | ⬜ | A1, R1 | Next.js が抱える責務範囲 / BFF 境界 / ドメインロジックの所在 / バックエンドとの契約 / R1 の具体化 |
| **A3** | — | 責務分離方針 (フロント内) | ⬜ | ⬜ | A1 | `components` / `hooks` / `features` / `lib` の責務 / 依存方向 / 境界違反禁止事項 |
| **A4** | — | ルーティング・レンダリング戦略 | ⬜ | ⚠️ | A1, A2 | App Router 採用 / Server Components 既定 / Client Components 境界 / CSR/SSR/SSG/ISR の使い分け / Server Actions の方針 |
| **A5** | — | ディレクトリ構造 | ⬜ | ⚠️ | A3, A4 | `src/` 配下の物理配置 / path alias (`@/*`) / co-location の方針 |
| **A6** | — | 命名規則 | ⬜ | ⬜ | A5 | ファイル名 (kebab / Pascal) / コンポーネント / hook / 型 / 定数 / route segment / テストファイル |
| **A7** | — | 環境変数管理 | ⬜ | ⬜ | A5 | `env/` 配下の構造 / 型付き Config loader / `NEXT_PUBLIC_` 境界 / シークレット境界 |

### Tier 3 の de facto 状態

- **A4 ⚠️**: `src/app/` (layout.tsx + page.tsx + globals.css) が存在し、App Router は事実上採用済み。ただし「Server Components 既定」「CSR/SSR/ISR の使い分け方針」は未文書化
- **A5 ⚠️**: `src/` ディレクトリ + `tsconfig.json` の `@/*` → `src/*` alias は設定済み。ただし `components/` / `hooks/` / `features/` / `lib/` の組織方針は未確定

---

## Tier 4: 実装方針

UI / スタイリング / データ統合 / 状態管理 / エラー / 観測性 / テスト / CI / セキュリティ 等、アーキテクチャ基盤の上に乗る具体実装の方針。

| 枠 ID | ADR # | タイトル | 選定済み | 実装済み | 依存 | 内容要旨 |
| --- | --- | --- | --- | --- | --- | --- |
| **B1** | — | スタイリング戦略 | ⬜ | ⚠️ | A5 | Tailwind v4 採用 / CSS Modules 不採用 / design token 管理 / `clsx` / `cn()` ヘルパ / global vs local 境界 |
| **B2** | — | UI コンポーネント方針 | ⬜ | ⬜ | A5, B1 | shadcn/ui 採用是非 / アイコンライブラリ / form コンポーネント / Headless UI 系の扱い |
| **B3** | — | BFF / API 統合 | ⬜ | ⬜ | A2, A4, A5 | `/api/*` の責務範囲 / 外部 API クライアントの場所 / fetch wrapper / リトライ・タイムアウト方針 |
| **B4** | — | 型生成 (API スキーマ) | ⬜ | ⬜ | A2, B3 | API 型を OpenAPI 等から生成するか手書きか / 生成物の扱い / generator 選定 |
| **B5** | — | 状態管理 | ⬜ | ⬜ | A3, A5, B3 | Server state (TanStack Query) / Client state (Zustand / Jotai / Context) / Form state / URL state の使い分け |
| **B6** | — | エラーハンドリング | ⬜ | ⬜ | A4, A5, B3 | `error.tsx` / `not-found.tsx` / `global-error.tsx` の責務 / Error Boundary 階層 / バックエンドエラー正規化 |
| **B7** | — | 観測性 / ロギング | ⬜ | ⬜ | A2, A5, B3 | 構造化ログ / ブラウザ → BFF 経由のログ送信 / Sentry 採用是非 / OpenTelemetry / トレース ID 伝播 |
| **B8** | — | テスト戦略 | ⬜ | ⬜ | A3, A4, A5, A6 | Vitest / RTL / MSW / Playwright / 層別カバレッジ / 配置・命名 / Server Components の扱い |
| **B9** | — | CI 構成方針 | ⬜ | ⬜ | A7, B8 | GitHub Actions job 設計 / required check / キャッシュ戦略 / matrix / G2 hook との二重化 |
| **B10** | — | セキュリティ運用 | ⬜ | ⬜ | T4, B9 | `pnpm audit` 閾値 / Dependabot or Renovate / SECURITY.md / 秘密スキャン (gitleaks 等) |

### Tier 4 の de facto 状態

- **B1 ⚠️**: `package.json` に `tailwindcss` / `@tailwindcss/postcss` + `postcss.config.mjs` + `src/app/globals.css` が存在。Tailwind v4 採用は事実上確定。ただし design token / `cn()` ヘルパ / global vs local 境界の方針は未文書化

---

## Tier 5: 機能・互換 (任意 / 用途依存)

i18n / a11y / パフォーマンス予算 / ブラウザサポート 等、boilerplate として「あれば望ましいが用途次第」の判断。

| 枠 ID | ADR # | タイトル | 選定済み | 実装済み | 依存 | 内容要旨 |
| --- | --- | --- | --- | --- | --- | --- |
| **C1** | — | i18n 戦略 | ⬜ | ⬜ | A4, A5 | next-intl 採用是非 / ロケール解決責務 / 翻訳キー設計 |
| **C2** | — | アクセシビリティ目標 | ⬜ | ⬜ | A5, B1 | WCAG レベル (AA?) / biome a11y ルールの活用 / 手動チェックタイミング |
| **C3** | — | パフォーマンス予算 | ⬜ | ⬜ | B1, B9 | Core Web Vitals SLO / Lighthouse 閾値 / bundle size 予算 / 計測の仕組み |
| **C4** | — | ブラウザサポート行列 | ⬜ | ⬜ | A4 | `browserslist` 固定 / polyfill 方針 / 切り捨て条件 |
| **C5** | — | フォント・画像 | ⬜ | ⬜ | A4, A5, B1 | `next/font` / `next/image` の使い方規約 / `public/` の扱い / 動的 OG 画像 |
| **C6** | — | Middleware 方針 | ⬜ | ⬜ | A4, B3 | `middleware.ts` の責務範囲 / Edge runtime 使用是非 / 認証 hook の置き場 |

---

## Tier 6: ドキュメント・メタ

ドキュメント運用 / portal / ライセンス 等、リポジトリ自体の運用に関する判断。

| 枠 ID | ADR # | タイトル | 選定済み | 実装済み | 依存 | 内容要旨 |
| --- | --- | --- | --- | --- | --- | --- |
| **D1** | — | ドキュメント運用ポリシー | ⬜ | ⬜ | — | canonical (英) / 翻訳 (日) ペア運用 / 更新責務 |
| **D2** | — | ポータル運用 | ⬜ | ⬜ | D1 | `docs/portal/manifest.yaml` への登録基準 / portal ↔ docs ディレクトリの責務分担 |
| **D3** | — | ライセンス選定 | ⬜ | ⚠️ | — | MIT 採用の根拠 / OSS 寄与ポリシー / 同梱ライブラリのライセンス整合 |
| **D4** | Dev-0003 | AGENTS.md 構成方針 | ✅ | ✅ | D1 | ファイル配置 / 本文言語 / 節構成 / Instruction Priority / `## [TODO]` セクション運用 |
| **D5** | Dev-0004 | Claude スキル運用方針 (運用系) | ✅ | ✅ | D4, G1, G2, T3, T4 | 配置・命名・frontmatter / 本文構造 / カバー範囲 / 商用操作前ユーザ確認 |
| **D6** | Dev-0005 | Claude スキル運用方針 (開発系) | ✅ | ⚠️ | D4, D1, A1 | 配置・命名・frontmatter は D5 共通 / カバー範囲 / subagent パターン / `new-env` の Next.js 再設計 |

### Tier 6 の de facto 状態

- **D3 ⚠️**: `LICENSE` ファイル (MIT) は存在。ただし「なぜ MIT を選んだか」「OSS 寄与ポリシー」は未文書化
- **D6 ⚠️**: 開発系 5 件のうち `new-env` のみ go-boilerplate 由来のパス (`internal/config/` 系) を前提。BACKLOG A7 確定後に再設計要

---

## 明示的に boilerplate では決めない (out of scope)

これらは boilerplate 単体では決めず、fork 先プロジェクトでの個別判断に委ねる。

- **認証 / セッション戦略** — fork 先の要件に依存 (Vercel / Auth.js / Clerk / 自前 BFF / SaaS IdP 等)
- **DB / 永続化** — R1 (0004) の表示層ロールの対象外
- **デプロイ先の具体実装** — R1 (0004) で「PaaS 主想定」と決めたのみ。CI/CD の具体的なデプロイステップは fork 先で扱う
- **ビジネスドメインモデル** — A2 で「ドメインはバックエンドが持つ」と決める前提

---

## 依存マップ (簡略)

```text
A1 (採用アーキテクチャ)
 ├─ A2 (バックエンドとの役割分離) ─ R1
 │   └─ B3 (BFF/API) ─ B4 (型生成)
 │       ├─ B5 (状態管理)
 │       ├─ B6 (エラー)
 │       └─ B7 (観測性)
 ├─ A3 (責務分離: フロント内)
 │   ├─ A5 (ディレクトリ)
 │   │   ├─ A6 (命名規則)
 │   │   ├─ A7 (環境変数)
 │   │   │   └─ B9 (CI) ─ B10 (セキュリティ; T4 拡張)
 │   │   ├─ B1 (スタイリング) ─ B2 (UI)
 │   │   └─ B8 (テスト)
 │   └─ (B5 etc は A3 にも依存)
 └─ A4 (Routing/Rendering)
     └─ (B3, B6, C1, C4, C5, C6 が依存)

G1 (git-workflow) ─ G2 (git-hooks; T2/T4 にも依存)
T1 ─ T2/T3/T4 (Tier 1 内の従属)
R1 (Tier 2) ─ T1/T3/T4 に依存

D1 (ドキュメント運用) ─ D2 (ポータル)
D3 (ライセンス)
D4 (AGENTS.md) ─ D5 (スキル運用系) / D6 (スキル開発系)
```

---

## ステータスの遷移

各項目は所属 Tier を変えずに、選定済み・実装済み 2 軸の状態のみが遷移する。

| 段階 | 選定済み | 実装済み |
| --- | --- | --- |
| 未着手 | ⬜ | ⬜ |
| 部分実装 (ADR 未策定だが事実上動いている) | ⬜ | ⚠️ |
| ADR 策定済み・実装未着手 | ✅ | ⬜ |
| ADR 策定済み・実装部分 | ✅ | ⚠️ |
| 完了 | ✅ | ✅ |

「事実上動いているが ADR 未策定」(`⬜` 選定済み + `⚠️` 実装済み) の項目は、**de facto を ADR で追認するだけのコストが低い** ため、優先度を上げて着手すべきシグナル。

---

## go-boilerplate Claude 資産 移植バックログ

隣接する `go-boilerplate` リポジトリの `.claude/` 資産(スキル / エージェント)のうち、本リポジトリの ADR 設計思想に照らして移植価値があるものの追跡。**実装ブロッカー(未確定 ADR)が外れたタイミングで着手する移植作業**を、ブロック元の枠 ID に紐づける。`.claude/` は [AGENTS.md](../../AGENTS.md) の保護対象であり、移植の実施はその都度ユーザ指示のもとで行う(本節は計画の記録)。

対象スナップショット: `go-boilerplate` `.claude/`(スキル 31 / エージェント 18 / 共有スペック 5)。

### 移植済 / 対象外

- **移植済(既存)**: canonicalize-doc / commit / local-review / new-env / readme-review / release-notes / submit-pr / sync-readme / tool-map / tools-upgrade、agent: adversarial-reviewer / review-verifier
- **移植済(A: 技術非依存)**: full-verify(+prompts+run.sh)/ full-apply、agent: arch-verifier / impl-verifier / doc-reviewer / comment-reviewer(godoc→TSDoc/JSDoc、正を AGENTS.md+一般原則へ)
- **移植済(B: 変換)**: adr-scan(走査を nextjs 化・枠 ID 体系へ分類 / PROVISIONAL)、node-upgrade(← go-upgrade。mise.toml SSOT のみ伝播)、repo-ops(器のみ。Docker/sqlc 項目は ADR 0004 で不適用)
- **対象外(D)**: portal-manifest-sync(`docs/portal/manifest.yaml` 不在。portal 導入 = **D2** 時に再検討)
- **既知の再設計対象**: `new-env` は移植済だが go 由来パス前提が残る([Dev-0005](Dev-0005.md) 記載)。**A7** 確定後に `src/config/` 等へ再設計(本節の移植計画とは別枠 = A7 の実装タスク)

### 保留(C): ADR 決定待ちの移植計画

Go 側の本丸は **spec 駆動 scaffold + 層別監査体系**。今移植すると AGENTS.md「保留領域に独自の規約・パターンを持ち込まない」に抵触するため、該当枠が **Accepted** になってから着手する。

| グループ | 資産 | ブロック元 | 着手トリガー | 翻案メモ(流用可能な骨格) |
| --- | --- | --- | --- | --- |
| C-1 層別アーキ監査 | `arch-check` + `arch-auditor-{domain,usecase,controller,infra,pkg}` | A1 / A3 / A5 | A3 Accepted + 層別 README が `src/**` に整備 | 層マッピングを差し替えるのみ。並列 fan-out + 「自層 README を正として実行時読込」構造は流用可。full-verify Pass1 との分担を明記 |
| C-2 層別ドリフト検出 | `back-prop` + `drift-detector-{domain,usecase,controller,infra,pkg}` | A3 / A5 | C-1 と同時期 | 検出カテゴリ A/B/C と read-only 原則は流用可。`sync-readme`(構造ドリフト)との分担を明記 |
| C-3 spec 生成・検証 | `new-spec` / `new-spec-{domain,usecase}`、`verify-spec` + `spec-validator-{domain,usecase}`、`.claude/scaffold-spec/*`(5) | A1 / A3 | A1 で「spec 駆動を採用」と決まった場合のみ | 「spec フォーマットを外部ファイルから実行時読込 = SSOT」設計は言語非依存で採用可。**不採用なら破棄** |
| C-4 onion scaffold | `scaffold-endpoint` / `scaffold-domain` / `scaffold-usecase` / `scaffold-controller` / `scaffold-infra-db` | A1 / A2 / A3 / A5(+B3 / B4) | A1/A3/A5 + B3(BFF/API)+ B4(型生成)確定後 | Go の onion + sqlc/OpenAPI 前提はほぼ載らない(表示層に DB 無し)。流用は chain 構造と「gen 由来マッピングを name-match 導出 → 不能なら halt/hand-off」の骨格のみ。**翻案コスト最大** |
| C-5 テスト scaffold/review | `scaffold-test` / `scaffold-integration-test` / `test-review` | B8 | B8 Accepted(フレームワーク・配置規約確定) | 「テスト観点を README から実行時導出」+ 2 段レビュー構造は流用可。`test-review` は既移植ワーカーを再利用。full-apply/node-upgrade/repo-ops の `pnpm test` 条件分岐も併せて見直す |
| C-6 Actions ピン留め | `actions-pin` | B9 | B9 で `.github/workflows/` 追加 + SHA ピン方針採用時 | 中身は言語非依存でほぼ無翻案。思想は `tools-upgrade` の quarantine と同系 |

**推奨着手順序**(BACKLOG 依存順): A1 決定 → C-3 採否確定 →(採用なら)C-4 翻案 / A3・A5 決定(層別 README 整備)→ C-1・C-2 / B8 決定 → C-5 / B9 決定 → C-6。各グループ着手時は該当枠が Accepted であることと Instruction Priority(ADR > BACKLOG > agent config)を再確認する。

### 付録: go-upgrade / repo-ops の処遇判断(経緯記録)

- **go-upgrade → node-upgrade に翻案**: `tools-upgrade` が mise 経由で node 更新をカバーし役割が一部重複するが、「リリースノート確認 + 破壊的変更チェック + フルリビルド検証」を伴う*意図的な単一ランタイム移動*の専用スキルとして価値があるため翻案移植。役割分担(node-upgrade=熟慮の単発 / tools-upgrade=定期一括監査)は go リポの go-upgrade vs tools-upgrade と同型。Go 版の `make sync-versions` / Dockerfile / go.mod / CI 同期は本リポジトリに存在しない(ADR 0004、B9 未着手)ため伝播先は `mise.toml` のみに簡素化。
- **repo-ops は器のみ**: Go 版の中身(Docker ツールランナー / sqlc / `schema.gen.sql` / root 所有生成物 / 稼働 DB)は ADR 0004(no-docker)と非互換でほぼ全滅。「read-only 運用 runbook」の型のみ再利用し、実在する落とし穴(mise / pnpm lockfile / make DRY_RUN の非空真値 / `tmp/reviews` の gitignore 漏れ / lefthook 未導入 = G2)だけを記載。新トラップを踏んだら追記して育てる。
