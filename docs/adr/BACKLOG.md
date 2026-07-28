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
| **G1** | 0150 | git-workflow | ✅ | ✅ | T1, T4 | ブランチ戦略 / コミット規約 (Feat/Fix/...) / PR 運用 / リリース運用 (`make tag-*`) |
| **G2** | 0151 | git-hooks | ✅ | ✅ | T2, T4, G1 | pre-commit / pre-push を lefthook で運用 / 速い hook + 権威 CI の二重化 |

### Tier 0 の実装ギャップ

- なし (G2 は 2026-07-12 に解消: `.lefthook.yaml` + lefthook devDependency (exact pin) 導入。pre-commit = `pnpm lint:ci` / pre-push = `pnpm typecheck`)。なお commit-msg hook (commitlint) は G2 の範囲外で、移植計画 Phase 1 / PR 1-1 (インベントリ A-2) にて別途導入予定

---

## Tier 1: ビルド・依存・ツールチェーン

パッケージマネージャ / フォーマッタ / バージョンマネージャ / 依存方針 等、開発環境を構成する基盤ツール。

| 枠 ID | ADR # | タイトル | 選定済み | 実装済み | 依存 | 内容要旨 |
| --- | --- | --- | --- | --- | --- | --- |
| **T1** | 0001 | package-manager (pnpm) | ✅ | ✅ | — | パッケージマネージャに pnpm を採用 / lockfile commit 必須 / npm・yarn 禁止 |
| **T2** | 0002 | formatter-linter (biome) | ✅ | ⚠️ | T1 | biome 優先 / biome 非対応検査のみ ESLint 補完 (能力ベース・重複禁止・縮小方向) / フォーマッタは biome 単独 / Prettier 不採用 / VSCode 連携 / **tsconfig 追加フラグ 5 件 + `target` 引き上げ**(型で捕まえる検査は tsc 側) |
| **T3** | 0003 | version-manager (mise) | ✅ | ✅ | T1 | ツール・言語バージョンの SSOT に `mise.toml` を採用 / 配送層への mise 拡張禁止 |
| **T4** | 0004 | library-management | ✅ | ✅ | T1 | npm 依存の選定・固定・更新・監査メタ方針 / コア依存は exact pin / メジャー更新は別 PR / 一次判定 (単一責務 × 単一 upstream) + 例外パス + fork コスト上限 |

### Tier 1 の実装ギャップ

- **T2 (0002)**: 2026-07-12 改定で「biome 非対応検査は ESLint で補完」を採択。**A3 ([0021](0021-frontend-responsibility.md)) が同日 Accepted となり、プラグイン (`eslint-plugin-boundaries`)・層定義マッピング (依存マトリクス)・severity (error) まで確定した**。残るは ESLint 実導入 PR (`eslint.config.mjs` の具体記述 + 本体・プラグインの devDependency exact pin + `lint:eslint` 追加と `lint:ci` への直列組込) のみ。biome 側の設定は実装済みのため実装済みは ⚠️
- **T4 (0004)**: ギャップ解消済み。主要 dev ツールは `typescript` を含め exact pin で整合し、PR テンプレート (`.github/pull_request_template.md`) に「ライブラリ採用チェック」節を組み込んだ

---

## Tier 2: 配送・ロール定義

デプロイ先の前提 / アプリケーションの役割 / 同梱しないもの 等、リポジトリ全体のスコープを規定する判断。

| 枠 ID | ADR # | タイトル | 選定済み | 実装済み | 依存 | 内容要旨 |
| --- | --- | --- | --- | --- | --- | --- |
| **R1** | 0011 | no-docker (表示層ロール定義) | ✅ | ✅ | T1, T3, T4 | Next.js を「表示層」として定義 / アプリ本体 Docker 不採用 / dev 補助 docker-compose は例外 |

---

## Tier 3: アーキテクチャ基盤

採用アーキテクチャ / 責務分離 / ルーティング・レンダリング / ディレクトリ構造 / 命名規則 / 環境変数 等、コード構造の前提を作る決定。**A1 → A2 → A3 → A4 → A5 → A6 → A7** の依存順で着手する。

| 枠 ID | ADR # | タイトル | 選定済み | 実装済み | 依存 | 内容要旨 |
| --- | --- | --- | --- | --- | --- | --- |
| **A1** | 0020 | 採用アーキテクチャ | ✅ | ⬜ | — | 全体パターンの宣言 (機能スライス × 表示層カーネル) / 設計原則 / 不採用パターン (onion 直訳 / Next.js 慣行ミニマル) |
| **A2** | 0070 | バックエンドとの役割分離 | ✅ | ⬜ | A1, R1 | Next.js = UI + 薄い BFF / `/api/*` = thin proxy(業務ロジック禁止)/ ドメインはバックエンド / 契約 SSOT = backend `openapi.gen.yaml` / 境界値所有(フロントが response 検証の最後の砦) |
| **A3** | 0021 | 責務分離方針 (フロント内) | ✅ | ⬜ | A1 | `features` / `model` / `components` / `adapters` 等カーネルの責務 / 依存方向 / 境界違反禁止 / カーネル命名規律・受入基準 / ESLint boundaries による機械強制 (Enforcement) |
| **A4** | 0040 | ルーティング・レンダリング戦略 | ✅ | ⚠️ | A1, A2 | App Router 単独 / Server Components 既定 / `"use client"` は feature 葉へ / Server Actions = `actions.ts` / page = 薄い driving adapter / モード非強制(Next.js 16 caching は B3/B6 へ) |
| **A5** | 0027 | ディレクトリ構造 | ✅ | ⚠️ | A3, A4 | `src/` 配下の物理配置 / path alias (`@/*`) / co-location の方針 / 共有モジュール粒度 |
| **A6** | 0028 | 命名規則 | ✅ | ⬜ | A5 | 優先順位 = Next.js > React > nextjs-boilerplate 自身・業界スタンダード / ファイル名 (全ソース kebab-case 統一) / 識別子 (component=Pascal / hook=useCamel / 型=Pascal / 定数=UPPER_SNAKE) / route segment (Next.js 小文字・`[slug]`・`(group)`・`_folder`) / 環境変数 (`{SUBSYSTEM}_{NAME}`・標準名〈`OTEL_*` 等〉は例外) / ADR ファイル (kebab・採番はブロック帯で確定〈0001〜0155〉) / テストファイルは B8 |
| **A7** | 0030 | 環境変数管理 | ✅ | ⬜ | A5 | 全 ENV 検証 (ビルド時 + 起動時のみ) / 不変 Config (`#`+getter) / server・client 分割 / ESM singleton 配布 / `NEXT_PUBLIC_` 境界 / Secret 境界 |

### Tier 3 の de facto 状態

- **A1 / A3(ADR 0020 / 0021 として策定済み・実装未)**: 2026-07-12 に層写像「B 改 2: 機能スライス × 表示層カーネル」(当初 9 カーネル → その後 **11 カーネル** = `src/{app, features, model, components, adapters, capabilities, stores, config, errors, logging, observability}`。`capabilities` は [0022](0022-capabilities-kernel.md)・`stores` は [0023](0023-stores-kernel.md) で追加) をユーザ決定し、[ADR 0020](0020-adopted-architecture.md)(採用アーキテクチャの宣言・設計原則・不採用パターン)/ [ADR 0021](0021-frontend-responsibility.md)(カーネル責務・依存マトリクス・命名規律・受入基準・Server Action 置き場・Enforcement・層別 README 運用)として成文化。命名規律 (カーネルは役割名のみ、`common`/`utils`/`lib` 等禁止)・受入基準 (go pkg Policy 翻案)・依存マトリクス込み。経緯・選択肢比較の記録は docs/plan 統合(2026-07-18)で破棄(git 履歴参照)。決定は ADR [0020](0020-adopted-architecture.md) / [0021](0021-frontend-responsibility.md) が正。物理ディレクトリ・層別 README・ESLint boundaries は実装未のため実装済みは ⬜
- **A5 / A6 / A7(ADR 0027 / 0028 / 0030 として策定済み・実装未)**: 2026-07-12 に A1/A3 (0020/0021) に続けて成文化。
  - **A5 = [ADR 0027](0027-directory-structure.md)**: 物理レイアウト・`@/*` alias 追認・co-location (feature 内フラット共置 / テストは実装隣接・`__tests__` 集約否定 / スタイルは Tailwind 既定)・共有粒度 (per-file 基本 → 肥大時 per-folder)・物理作成タイミング (空ディレクトリ禁止)
  - **A6 = [ADR 0028](0028-naming-convention.md)**: 命名優先順位 = **Next.js 規約 > React 規約 > nextjs-boilerplate 自身の既存規約・業界スタンダード**(go-boilerplate は命名の権威に置かない)。ファイル名は**全ソース kebab-case 統一**(Next.js は特殊ファイル以外を unopinionated → 業界スタンダード/shadcn/FS 安全性/自リポ既存の小文字ファイル。従来型 React の PascalCase コンポーネントファイルは不採用)・特殊ファイル/route は Next.js 小文字規約(`[slug]`/`(group)`/`_folder`)・識別子は React 規約(component=PascalCase 等・`I` プレフィックス禁止)・環境変数 `{SUBSYSTEM}_{NAME}`・ADR ファイル `NNNN-kebab`(自リポ既存規約 `docs/adr/README.md`・採番方式はトピック順ブロック帯で確定〈2026-07-14・0001〜0155〉。`Dev-`/`Toolchain-` は数値列へ畳み込み)・テストファイル命名は B8 へ引き渡し。カーネル命名規律は 0021 が正
  - **A7 = [ADR 0030](0030-environment-variable-management.md)**: env/config の翻案方針 (全 ENV 検証 = ビルド時 + サーバ起動時のみ / `#` private + getter の不変 Config / server・client 分割 / `process.env` 直読は config モジュールのみ・biome `noProcessEnv` 強制 / 配布 = ESM シングルトン + import 境界 / 受け手 4 分類 / no-Docker のため embed → Next.js native `.env` + PaaS secret store)。討議経緯は docs/plan 統合(2026-07-18)で破棄(git 履歴参照)。決定は ADR [0030](0030-environment-variable-management.md) が正
  - 物理ディレクトリ・層別 README・ESLint boundaries・config 実装は未のため実装済みは A5=⚠️(`@/*` alias 設定済) / A6=⬜ / A7=⬜
- **A4(ADR 0040 として策定済み・実装 ⚠️)**: 2026-07-12 に [ADR 0040](0040-routing-rendering-strategy.md) として成文化(App Router 単独 / Server Components 既定 / `"use client"` は feature 葉へ押し下げ / Server Actions = feature 内 `actions.ts` / page = 薄い driving adapter / レンダリングモード非強制)。`src/app/` (layout.tsx + page.tsx + globals.css) は存在 = 実装 ⚠️。Next.js 16 の caching(`use cache` / PPR / Cache Components 有効化)は B3 / B6 へ委譲、`loading.tsx` / `error.tsx` 配置は B6 へ
- **A2(ADR 0070 として策定済み・実装未)**: 2026-07-13 に [ADR 0070](0070-backend-role-separation.md) として成文化(Next.js = UI + 薄い BFF / `/api/*` = thin proxy・業務ロジック禁止 / ドメインはバックエンド / 契約 SSOT = backend `openapi.gen.yaml`(go ADR 0012 消費者側)/ 境界値所有 = go ADR 0015 翻案・response 検証はフロントが最後の砦 / 認証・セッション具体は fork 先判断)。**Tier 3(A 系)はこれで全 ADR 化完了**

---

## Tier 4: 実装方針

UI / スタイリング / データ統合 / 状態管理 / エラー / 観測性 / テスト / CI / セキュリティ 等、アーキテクチャ基盤の上に乗る具体実装の方針。

| 枠 ID | ADR # | タイトル | 選定済み | 実装済み | 依存 | 内容要旨 |
| --- | --- | --- | --- | --- | --- | --- |
| **B1** | 0050 | スタイリング戦略 | ✅ | ⚠️ | A5 | Tailwind 主軸 / CSS Modules 限定許可(styled-components・emotion 非採用)/ design token = CSS 変数 / `cn()` = `clsx` + `tailwind-merge`(`components` カーネル内)/ variant 定義 = `cva` / global は `globals.css` 集約 |
| **B2** | 0052 | UI コンポーネント方針 | ✅ | ⬜ | A5, B1 | **v1 バッテリー採用(2026-07-14 反転)**: shadcn/ui + lucide-react + 複雑入力 + リッチテキスト(TipTap)を採用(`components` カーネル・vendor 越し差替可能。0010 / 0004)/ variant 定義は `cva`。旧「非同梱」から反転 |
| **B3** | 0071 | BFF / API 統合 | ✅ | ⬜ | A2, A4, A5 | API クライアント = `adapters` / fetch wrapper に go 0019 resilience を広く翻案(dual timeout / idempotent retry / retry budget / circuit breaker)/ 生 status を errors へ正規化 / response は adapters 境界で zod 検証 |
| **B4** | 0072 | 型生成 (API スキーマ) | ✅ | ⬜ | A2, B3 | backend `openapi.gen.yaml` から **orval で zod + 型生成**(型 + runtime validation)/ `gen/` do-not-edit / gh 取込 + short SHA スタンプ / 型漏洩禁止(adapters 変換)/ drift ゲート |
| **B5** | 0060 | 状態管理 | ✅ | ⬜ | A3, A5, B3 | Server state = Server Component fetch 既定 / Client state = local から / **v1 バッテリー採用(2026-07-14 反転)**: react-hook-form + zod / Zustand(横断 client 状態は `stores` カーネル 0023)/ **`nuqs` 等 searchParams ヘルパは v1 不採用**(標準形は scaffold 生成で担保)。旧「非同梱」から反転 |
| **B6** | 0080 | エラーハンドリング | ✅ | ⬜ | A4, A5, B3 | errors カーネル = protocol-agnostic sentinel 分類 / adapters 境界で HTTP status→分類+code+message 正規化(1 回)/ error.tsx・global-error.tsx・not-found.tsx は表示のみ / swallow 禁止・cause chain・redact / 5xx=error・4xx=warn |
| **B7** | 0081 | 観測性 / ロギング | ✅ | ⬜ | A2, A5, B3 | logging/observability カーネル / 抽象ロガー(ctx-native・trace_id 自動注入)/ OTel vendor-neutral OTLP-only / signal 別 config gating / 公式 semconv のみ / ブラウザ→BFF 中継 seam / **RUM SaaS は fork 先判断(exclusion)** |
| **B8** | 0090 | テスト戦略 | ✅ | ⬜ | A3, A4, A5, A6 | Vitest + RTL + MSW + Playwright / go 準拠戦略(co-location・正常系異常系・table-driven 禁止)/ 90% ハードゲート / integration=HTTP 境界 mock / 二層実行(CI 厳格 / hook 高速)/ 命名は 0028 kebab |
| **B9** | 0153 | CI 構成方針 | ✅ | ⬜ | A7, B8 | 1 関心事=1 workflow(lint/typecheck/build/test/e2e)/ SHA ピン + concurrency + 最小 permissions / hooks mirror CI / upsert-pr-comment / matrix 非採用(単一 ubuntu・mise SSOT) |
| **B10** | 0110 | セキュリティ運用 | ✅ | ⚠️ | T4, B9 | Dependabot cooldown(patch5/minor7/major30・security 即時)/ gitleaks fail-closed / Trivy fs 二段(dev advisory・release strict)/ CodeQL js-ts / pnpm audit(severity high+ / 修正可能性で blocking。到達性フィルタは現行ツール非対応)/ SECURITY.md / **CSP 適合ゲート**(配信ヘッダと 0111 宣言の突合・fail-closed)/ **image-scan・cosign・SBOM は no-docker で exclusion** |

### Tier 4 の de facto 状態

- **B1(ADR 0050 として策定済み・実装 ⚠️)**: 2026-07-12 に [ADR 0050](0050-styling-strategy.md) として成文化(2026-07-14・v1 でバッテリー採用へ部分改訂 = Tailwind 主軸 / CSS Modules 限定許可・styled-components・emotion 非採用 / `cn()` は `components` カーネル内 / design token = CSS 変数 / global は `globals.css` 集約)。`tailwindcss` / `@tailwindcss/postcss` + `postcss.config.mjs` + `src/app/globals.css` は存在 = 実装 ⚠️(`cn()` = `clsx` + `tailwind-merge` / variant 定義 = `cva` を ADR で確定済み。依存追加と実装は実装 PR)
- **B2 / B5(ADR 0052 / 0060 — 2026-07-14 に v1 バッテリー採用へ反転)**: 当初(2026-07-12)は本体非同梱の exclusion だったが、**v1 = 一般的 Next.js アプリ基盤として必要ライブラリを採用**の方針転換で反転。0052 = shadcn/ui + lucide-react + 複雑入力採用 / 0060 = react-hook-form + zod / Zustand(横断 client 状態は `stores` カーネル [0023](0023-stores-kernel.md))。B5 の Server state = RSC fetch 既定 / Client state = local から、は不変。詳細は [docs/plan/master-plan.md](../plan/master-plan.md) の採用ロードマップ節
- **B8(ADR 0090 として策定済み・実装未)**: 2026-07-12 に [ADR 0090](0090-testing-strategy.md) として成文化(Vitest + RTL + MSW + Playwright / go 準拠戦略 / 90% ハードゲート / integration=HTTP 境界 mock / 二層実行 / 命名は 0028 kebab + `.test.ts`)。FW 導入・カバレッジゲート CI は実装 PR(移植 Phase 5)。実装中補正可
- **B3 / B4(ADR 0071 / 0072 として策定済み・実装未)**: 2026-07-13 に決定 4 バッチとして成文化。B3 = [ADR 0071](0071-bff-api-integration.md)(API クライアント = `adapters` / fetch wrapper に go ADR 0019 resilience を広く翻案 = dual timeout + idempotent retry + retry budget + circuit breaker / 生 status を errors へ正規化・詳細テーブルは B6 / response は adapters 境界で zod 検証 / SSRF guard は外部叩き時のみ)。B4 = [ADR 0072](0072-api-type-generation.md)(**型 + runtime validation を orval で zod 生成** — 決定 4 当初の openapi-typescript 型のみから、go 境界値所有哲学に合わせユーザが変更 / `gen/` do-not-edit / gh 取込 + short SHA スタンプ + マニフェスト / 型漏洩禁止 = adapters 変換 / drift ゲート)。取込 + 生成パイプライン・drift ゲート CI は実装 PR(A-9 setup 翻案 / C-4)
- **B6 / B7 / B9 / B10(ADR 0080 / 0081 / 0153 / 0110 として策定済み・実装未)**: 2026-07-13 に成文化。B6 = [ADR 0080](0080-error-handling.md)(errors カーネル = go apperror 0038 翻案 / sentinel 分類 + 境界正規化 + error.tsx 階層 / swallow 禁止・cause chain)。B7 = [ADR 0081](0081-observability-logging.md)(logging/observability カーネル = go 0059-0061 翻案 / OTLP-only + signal gating + 公式 semconv / ブラウザ→BFF 中継 seam / **RUM SaaS は fork 先 exclusion**)。B9 = [ADR 0153](0153-ci-configuration.md)(go workflows 翻案 / 1 関心事=1 workflow・SHA ピン・最小 permissions・hooks mirror / job は biome/tsc/next build/vitest/playwright / matrix 非採用)。B10 = [ADR 0110](0110-security-operations.md)(go 0077 多層防御翻案 / Dependabot cooldown・gitleaks・Trivy 二段・CodeQL js-ts / **image-scan・cosign・SBOM は本リポ 0011 no-docker で exclusion**)。errors/logging/observability カーネル物理作成・CI workflows 実装は実装 PR(Phase 1/2)
- **B10 の実装 ⚠️ の内訳**: gitleaks / Trivy をローカル(`mise.toml` + `make secret-scan` / `make trivy-fs` + pre-push hook)へ導入済み。抑止ポリシー様式(`.gitleaks.toml` / `.gitleaksignore` / `.trivyignore.yaml`)も確定済み。**未実装は CI 側** — CodeQL / gitleaks / Trivy 二段 / Dependabot cooldown / `pnpm audit` ゲート / SECURITY.md / CSP 適合ゲート

---

## Tier 5: 機能・互換 (任意 / 用途依存)

i18n / a11y / パフォーマンス予算 / ブラウザサポート 等、boilerplate として「あれば望ましいが用途次第」の判断。

| 枠 ID | ADR # | タイトル | 選定済み | 実装済み | 依存 | 内容要旨 |
| --- | --- | --- | --- | --- | --- | --- |
| **C1** | 0121 | i18n 戦略 | ✅ | ⬜ | A4, A5 | **exclusion**: i18n ライブラリ本体非同梱(fork 先判断)+ 採用時の App Router seam(proxy.ts/`[locale]`) |
| **C2** | 0100 | アクセシビリティ目標 | ✅ | ⬜ | A5, B1 | WCAG 2.x AA 目標 / biome a11y ルール活用(`lint:ci`)/ 手動チェックは UI feature 実装 PR 時 |
| **C3** | 0101 | パフォーマンス予算 | ✅ | ⬜ | B1, B9 | 指標=Core Web Vitals / 計測の仕組みは持つ(B9)/ **具体閾値は用途依存で fork 先・実装 PR** |
| **C4** | 0102 | ブラウザサポート行列 | ✅ | ⬜ | A4 | Next.js 既定 browserslist 追認 / polyfill は Next.js 委譲 / 切り捨て条件は fork 先 |
| **C5** | 0045 | フォント・画像 | ✅ | ⬜ | A4, A5, B1 | `next/font` / `next/image` 既定 / `public/` は静的公開アセット / 動的 OG は `ImageResponse` / **backend 由来画像 = public storage 前提・自前配信レイヤなし**(`mediaUrl()` + `remotePatterns` のみ・blur 非採用) |
| **C6** | 0043 | Middleware 方針 | ✅ | ⬜ | A4, B3 | **Next.js 16 で Middleware→Proxy(`proxy.ts`)** / thin・last resort / 既定 Node runtime(`runtime` 指定不可・Edge 互換維持)/ 認証は fork 先(optimistic のみ・確定認可はデータ境界) |
| **C7** | 0044 | SEO / メタデータ戦略 | ✅ | ⬜ | A4, C5 | Metadata API 既定(`metadataBase`/`title.template`)/ `sitemap.ts`・`robots.ts` / `alternates.canonical` / JSON-LD 枠 / アイコン体系(0045 と責務分担)/ proxy matcher 除外 / 具体値は fork 先 |
| **C8** | 0130 | PWA 戦略 | ✅ | ⬜ | C7 | **exclusion**: Web App Manifest / Service Worker / オフライン本体非同梱(fork 先判断)+ 採用時の `manifest.*` seam |
| **C9** | 0131 | Cookie 同意 | ✅ | ⬜ | A2, C6 | **v1 採用(exclusion から反転)**: 軽量 consent 機構(同意状態保持 / バナー / スクリプト読み込みゲート / 計測 cookie_id)を同梱 / **CMP・IAB TCF とトラッキング製品本体は非同梱**(一部 exclusion)/ 状態供給は 0031 |

### Tier 5 の状態

- **C1〜C6(各 ADR として策定済み・実装未)**: 2026-07-13 に成文化。用途依存の Tier 5 のため多くは exclusion / fork 先判断 / Next.js 組込み追認。C1=[0121](0121-i18n-strategy.md)(i18n exclusion)/ C2=[0100](0100-accessibility-target.md)(WCAG AA + biome a11y)/ C3=[0101](0101-performance-budget.md)(CWV・仕組みのみ・閾値は fork 先)/ C4=[0102](0102-browser-support.md)(Next.js 既定 browserslist 追認)/ C5=[0045](0045-fonts-and-images.md)(next/font・next/image)/ C6=[0043](0043-middleware-policy.md)(**Next.js 16 = proxy.ts**・thin・認証は fork 先)。go はバックエンドで C 系にほぼ対応物がなく(フロント固有)、AGENTS.md にも C 系 `[TODO]` はない(0152 掲載基準 = ブロック項目のみ)ため BACKLOG C 枠のみを根拠に成文化
- **C7〜C9(各 ADR として策定済み・実装未)**: 2026-07-13 の敵対的レビューで、当初の C 列挙(C1〜C6)が**表示層 boilerplate の中心的関心事である SEO / メタデータ体系を取りこぼしていた**ことが判明し補完。C7=[0044](0044-seo-metadata-strategy.md)(Metadata API 既定 + `sitemap.ts`/`robots.ts` + canonical + JSON-LD 枠 + アイコン体系。0045 と責務分担)/ C8=[0130](0130-pwa-strategy.md)(PWA exclusion。沈黙だった線引きを明文化)/ C9=[0131](0131-cookie-consent.md)(Cookie 同意。**軽量機構 + スクリプトゲートは v1 採用 / CMP・トラッキング製品本体は非同梱**)。テーマ / ダークモードは新枠を立てず [0050](0050-styling-strategy.md)(B1)に「テーマ / ダークモード」節を追記(token 切替 + `prefers-color-scheme` 追従)。favicon / app icon の体系は C7(0044)がアイコン規約として吸収(0045 は静的 favicon の `public/` 配置のみ)

---

## Tier 6: ドキュメント・メタ

ドキュメント運用 / portal / ライセンス 等、リポジトリ自体の運用に関する判断。

| 枠 ID | ADR # | タイトル | 選定済み | 実装済み | 依存 | 内容要旨 |
| --- | --- | --- | --- | --- | --- | --- |
| **D1** | 0140 | ドキュメント運用ポリシー | ✅ | ⬜ | — | canonical 言語 = EN 目標・移行は v1(0.0.x は日本語 living)/ タクソノミー4分類(decision・exclusion=ADR / rule=rules.md 新設 / inventory=BACKLOG)/ ADR 不可変性(0.0.x living→v1 immutable)/ per-package README |
| **D2** | 0141 | ポータル運用 | ✅ | ⬜ | D1 | `docs/portal/manifest.yaml` = 構造制御のみ(curated manual)/ コード README 手動登録・`docs/*` 自動発見 / GitHub Pages 配信 / 実装は Phase 3(B9 後) |
| **D3** | 0142 | ライセンス選定 | ✅ | ✅ | — | MIT 採用根拠(最大許容・エコシステム標準・go 統一)/ OSS 寄与 = inbound=outbound・CLA なし / 同梱ライブラリ整合は 0004 / `private:true` は publish ガードで MIT と両立 |
| **D4** | 0152 | AGENTS.md 構成方針 | ✅ | ✅ | D1 | ファイル配置 / 本文言語 / 節構成 / Instruction Priority / `## [TODO]` セクション運用 |
| **D5** | 0154 | Claude スキル運用方針 (運用系) | ✅ | ✅ | D4, G1, G2, T3, T4 | 配置・命名・frontmatter / 本文構造 / カバー範囲 / 商用操作前ユーザ確認 |
| **D6** | 0155 | Claude スキル運用方針 (開発系) | ✅ | ⚠️ | D4, D1, A1 | 配置・命名・frontmatter は D5 共通 / カバー範囲 / subagent パターン / `new-env` の Next.js 再設計 |

### Tier 6 の de facto 状態

- **D1 / D2(ADR 0140 / 0141 として策定済み・実装未)**: 2026-07-13 に決定 5 バッチとして成文化。D1 = [ADR 0140](0140-documentation-operations.md)(canonical 言語 = **EN 目標・移行は v1**〈ユーザ決定・0.0.x は日本語 canonical のまま living〉/ タクソノミー4分類 / **`rules.md` 新設 + AGENTS.md rule 段階移行**〈0152 整合はユーザ承認要〉/ ADR 不可変性 = 0.0.x living→v1 immutable〈go モデル翻案〉/ per-package README)。D2 = [ADR 0141](0141-portal-operations.md)(portal 未導入 / manifest = 構造制御のみ・curated manual / コード README 手動登録・`docs/*` 自動発見 / GitHub Pages / **実装は Phase 3 = B9 後**)。rules.md 新設・EN canonical 化・portal 実装はいずれも後続(段階移行 / v1 / Phase 3)
- **D3(ADR 0142 として策定済み)**: 2026-07-13 に成文化([ADR 0142](0142-license.md))。MIT 採用根拠(最大許容・エコシステム標準・go-boilerplate と統一・低儀式性)/ OSS 寄与 = **inbound=outbound・CLA なし**(DCO は必要時 `CONTRIBUTING.md`)/ 同梱ライブラリのライセンス整合は [0004](0004-library-management.md) 許可リストが担保 / `package.json` の `private:true` は npm publish ガードで MIT と別レイヤ・両立。**follow-up: `package.json` に `"license": "MIT"` 追加はルート設定保護のためユーザ指示待ち**
- **D6 ⚠️**: 開発系 5 件は A7 ([0030](0030-environment-variable-management.md)) の構造へ揃済。`new-env` は `src/config/` の目的別 config モジュールを対象とするが、`src/config/` の着地は A7 実装 PR (v1 計画 P3-3) のため、それまで実行不可 (スキル側がガードして停止する)

---

## 明示的に boilerplate では決めない (out of scope)

これらは boilerplate 単体では決めず、fork 先プロジェクトでの個別判断に委ねる。

- **認証 / セッション戦略** — fork 先の要件に依存 (Vercel / Auth.js / Clerk / 自前 BFF / SaaS IdP 等)
- **DB / 永続化** — R1 (0011) の表示層ロールの対象外
- **デプロイ先の具体実装** — R1 (0011) で「PaaS 主想定」と決めたのみ。CI/CD の具体的なデプロイステップは fork 先で扱う
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
     └─ (B3, B6, C1, C4, C5, C6, C7 が依存)
         └─ C7 (SEO/メタデータ) ─ C8 (PWA) / C9 (Cookie 同意; A2/C6 にも依存)

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
- **移植済(B: 変換)**: adr-scan(走査を nextjs 化・枠 ID 体系へ分類 / PROVISIONAL)、node-upgrade(← go-upgrade。mise.toml SSOT のみ伝播)、repo-ops(器のみ。Docker/sqlc 項目は ADR 0011 で不適用)
- **対象外(D)**: portal-manifest-sync(`docs/portal/manifest.yaml` 不在。**D2**([0141](0141-portal-operations.md))は Accepted 済み・portal 実装は Phase 3 のため、portal 導入時に移植)
- **実行可能条件つき**: `new-env` は A7([0030](0030-environment-variable-management.md))の `src/config/` 構造へ再設計済。実行できるのは **A7 実装 PR(v1 計画 P3-3)で `src/config/` が着地してから**(未着地ならスキルがガードして停止)

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

- **go-upgrade → node-upgrade に翻案**: `tools-upgrade` が mise 経由で node 更新をカバーし役割が一部重複するが、「リリースノート確認 + 破壊的変更チェック + フルリビルド検証」を伴う*意図的な単一ランタイム移動*の専用スキルとして価値があるため翻案移植。役割分担(node-upgrade=熟慮の単発 / tools-upgrade=定期一括監査)は go リポの go-upgrade vs tools-upgrade と同型。Go 版の `make sync-versions` / Dockerfile / go.mod / CI 同期は本リポジトリに存在しない(ADR 0011、B9 未着手)ため伝播先は `mise.toml` のみに簡素化。
- **repo-ops は器のみ**: Go 版の中身(Docker ツールランナー / sqlc / `schema.gen.sql` / root 所有生成物 / 稼働 DB)は ADR 0011(no-docker)と非互換でほぼ全滅。「read-only 運用 runbook」の型のみ再利用し、実在する落とし穴(mise / pnpm lockfile / make DRY_RUN の非空真値 / `tmp/reviews` の gitignore 漏れ / lefthook 未導入 = G2 ※2026-07-12 解消済・スキル本文の更新は未)だけを記載。新トラップを踏んだら追記して育てる。
