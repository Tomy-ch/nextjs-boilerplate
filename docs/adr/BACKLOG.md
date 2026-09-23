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
- 枠 ID の letter prefix は上記 7 つで予約済み。**他の ID 体系はこれと衝突しない接頭辞を用いる** — [移植バックログ](#go-boilerplate-claude-資産-移植バックログ)のグループ ID が 2 文字の `GB-N` (`GB` = go-boilerplate) なのはこのため
- 公式の **ADR 番号** (`0001`-`9999`) はファイル化のタイミングで採番し、`ADR #` 列に記録する。BACKLOG 内の依存参照は枠 ID で行う
- **2 軸の意味**:
  - **選定済み**: ADR ファイルが書かれて Status = Accepted になっているか
  - **実装済み**: 方針を実行するための仕組み (config / artifact / コード) がリポジトリに存在するか
- **「やらない」と決めた事項の撤回条件は、その決定を書いた ADR の本文が持つ**（[0140](0140-documentation-operations.md) 決定 2）。本ボードは持たない

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

- なし (G2 は解消済: `.lefthook.yaml` + lefthook devDependency (exact pin) を導入。pre-commit = `pnpm lint:ci` + `pnpm lint:md` + `make actionlint` / commit-msg = `make commitlint` / pre-push = `pnpm typecheck` + `make secret-scan`)

---

## Tier 1: ビルド・依存・ツールチェーン

パッケージマネージャ / フォーマッタ / バージョンマネージャ / 依存方針 等、開発環境を構成する基盤ツール。

| 枠 ID | ADR # | タイトル | 選定済み | 実装済み | 依存 | 内容要旨 |
| --- | --- | --- | --- | --- | --- | --- |
| **T1** | 0001 | package-manager (pnpm) | ✅ | ✅ | — | パッケージマネージャに pnpm を採用 / lockfile commit 必須 / npm・yarn 禁止 |
| **T2** | 0002 | formatter-linter (biome) | ✅ | ✅ | T1 | biome 優先 / biome 非対応検査のみ ESLint 補完 (能力ベース・重複禁止・縮小方向) / フォーマッタは biome 単独 / Prettier 不採用 / VSCode 連携 / **tsconfig 追加フラグ 5 件 + `target` 引き上げ**(型で捕まえる検査は tsc 側) |
| **T3** | 0003 | version-manager (mise) | ✅ | ✅ | T1 | ツール・言語バージョンの SSOT に `mise.toml` を採用 / 配送層への mise 拡張禁止 |
| **T4** | 0004 | library-management | ✅ | ✅ | T1 | npm 依存の選定・固定・更新・監査メタ方針 / コア依存は exact pin / メジャー更新は別 PR / 一次判定 (単一責務 × 単一 upstream) + 例外パス + fork コスト上限 |
| **T5** | 0156 | ブラウザ実測ツール | ✅ | ⚠️ | T1, T3, B8 | 観測の 3 レーン(見る・触る / 測る / 掘る)と問い 1 つに道具 1 つ / CLI 前提・MCP 登録しない / 実ブラウザのプロファイルへ接続しない / 取得経路は Node パッケージ=pnpm・単体バイナリ=mise(`npm:` backend 不採用) / 基準画像とゲートには接続しない |
| **T6** | 0158 | コード検索・影響解析ツール | ✅ | ✅ | T1, T3 | 採るのは関係付きの推移的な変更影響(`affected`)で grep の置き換えにはしない / 問い合わせは予算で切り詰められグラフはスナップショットなので、網羅が要る問いは grep へ戻る / 取得は単体バイナリとして mise / 導入経路は bootstrap 1 本 / 外部 LLM API を呼ぶ操作は都度確認 |
| **T7** | 0159 | 補助スクリプトの言語と構造 | ✅ | ✅ | T1 | 補助スクリプトは TypeScript + `tsx` で書き呼び出し側も揃える(シェル据え置きは要件を持つものだけ)/ `scripts/` 直下は 1 ツール = 1 ディレクトリで入口は `index.ts` / 入口と判定を分ける / export と test の 1:1 対応をゲートにする |

### Tier 1 の実装ギャップ

- **T2 (0002)**: 「biome 非対応検査は ESLint で補完」を採択し、A3 ([0021](0021-frontend-responsibility.md)) がプラグイン (`eslint-plugin-boundaries`)・層定義マッピング (依存マトリクス)・severity (error) を確定した。biome 側の設定に加えて ESLint も導入済みで、依存マトリクスは `architecture.ts` を正に `eslint.config.ts` が import し、層 README の `imports-allowed` はそこから生成する(`gen:architecture`)。生成結果との差分検査は `check:architecture` が担う。いずれも `lint:ci` に直列で載る
- **T4 (0004)**: ギャップ解消済み。主要 dev ツールは `typescript` を含め exact pin で整合し、PR テンプレート (`.github/pull_request_template.md`) に「ライブラリ採用チェック」節を組み込んだ
- **T5 (0156)**: 道具は導入済み（`mise.toml` の `agent-browser` / devDependency の `chrome-devtools-mcp`）で、エージェントの許可は「末尾に自由な入力を残さない + フラグ等価の環境変数を固定」の形で担保済み。**未了は 2 点** —— 観測に使うブラウザをゲートと同じ chromium へ向ける環境変数の置き場が決まっておらず呼ぶ側で都度解決していること、「掘る」レーン（`chrome-devtools`）を実際の調査で通していないこと

---

## Tier 2: 配送・ロール定義

デプロイ先の前提 / アプリケーションの役割 / 同梱しないもの 等、リポジトリ全体のスコープを規定する判断。

| 枠 ID | ADR # | タイトル | 選定済み | 実装済み | 依存 | 内容要旨 |
| --- | --- | --- | --- | --- | --- | --- |
| **R1** | 0011 | no-docker (表示層ロール定義) | ✅ | ✅ | T1, T3, T4 | Next.js を「表示層」として定義 / アプリ本体 Docker 不採用 / dev 補助 docker-compose は例外 |
| **R2** | 0056 | mock app の公開 | ✅ | ⬜ | — | **exclusion**: mock app を Storybook / portal と並ぶ公開面にしない(示す立場に無いものを常設しない / 開発専用の口が開く環境でしか完動しない)/ 検証の土台としての同梱は変わらない |

---

## Tier 3: アーキテクチャ基盤

採用アーキテクチャ / 責務分離 / ルーティング・レンダリング / ディレクトリ構造 / 命名規則 / 環境変数 等、コード構造の前提を作る決定。**A1 → A2 → A3 → A4 → A5 → A6 → A7** の依存順で着手する。

| 枠 ID | ADR # | タイトル | 選定済み | 実装済み | 依存 | 内容要旨 |
| --- | --- | --- | --- | --- | --- | --- |
| **A1** | 0020 | 採用アーキテクチャ | ✅ | ✅ | — | 全体パターンの宣言 (機能スライス × 表示層カーネル) / 設計原則 / 不採用パターン (onion 直訳 / Next.js 慣行ミニマル) |
| **A2** | 0070 | バックエンドとの役割分離 | ✅ | ✅ | A1, R1 | Next.js = UI + 薄い BFF / `/api/*` = thin proxy(業務ロジック禁止)/ ドメインはバックエンド / 契約 SSOT = backend `openapi.gen.yaml` / 境界値所有(フロントが response 検証の最後の砦) |
| **A3** | 0021 | 責務分離方針 (フロント内) | ✅ | ✅ | A1 | `features` / `model` / `components` / `adapters` 等カーネルの責務 / 依存方向 / 境界違反禁止 / カーネル命名規律・受入基準 / ESLint boundaries による機械強制 (Enforcement) |
| **A4** | 0040 | ルーティング・レンダリング戦略 | ✅ | ✅ | A1, A2 | App Router 単独 / Server Components 既定 / `"use client"` は feature 葉へ / Server Actions = `actions.ts` / page = 薄い driving adapter / モード非強制(Next.js 16 caching は B3/B6 へ) |
| **A5** | 0027 | ディレクトリ構造 | ✅ | ✅ | A3, A4 | `src/` 配下の物理配置 / path alias (`@/*`) / co-location の方針 / 共有モジュール粒度 |
| **A6** | 0028 | 命名規則 | ✅ | ✅ | A5 | 優先順位 = Next.js > React > nextjs-boilerplate 自身・業界スタンダード / ファイル名 (全ソース kebab-case 統一) / 識別子 (component=Pascal / hook=useCamel / 型=Pascal / 定数=UPPER_SNAKE) / route segment (Next.js 小文字・`[slug]`・`(group)`・`_folder`) / 環境変数 (`{SUBSYSTEM}_{NAME}`・標準名〈`OTEL_*` 等〉は例外) / ADR ファイル (kebab・採番はブロック帯で確定〈0001〜0155〉) / テストファイルは B8 |
| **A7** | 0030 | 環境変数管理 | ✅ | ✅ | A5 | 全 ENV 検証 (ビルド時 + 起動時のみ) / 不変 Config (`#`+getter) / server・client 分割 / ESM singleton 配布 / `NEXT_PUBLIC_` 境界 / Secret 境界 |
| **A8** | 0010 | 標準準拠と非ロックイン | ✅ | ⚠️ | — | seam の形はデファクトに乗り独自発明しない / ロックイン判定の根は選択の主体が誰か(可搬性・正当性材料の 2 診断)/ 乗る決定にはベンダー非依存の正当性材料を必ず添える / 判断の宛先はいまの snapshot であって履歴ではない |
| **A9** | 0022 | `capabilities` カーネル | ✅ | ✅ | A3 | runtime(ブラウザ + フレームワーク)の能力を reactive な client hook として供給 / `"use client"` 固定 / remote IO・業務状態・ポリシー状態は受けない / 合成は feature が行う |
| **A10** | 0023 | `stores` カーネル | ✅ | ✅ | A3 | 複数 feature が共有する横断 client 状態(Zustand)の家 / `"use client"` 固定 / server state の二重キャッシュ禁止、ただし利用者の選択の記録は射程外(鮮度の責任が誰にあるかで判定)/ 昇格ルールの 5 つ目の出口 |
| **A11** | 0024 | adapters の server/client 分割 | ✅ | ✅ | A3 | 境界カーネルを WHAT(remote 外部システム / local runtime)× WHERE(server / client)の 2 軸で位置づけ / `adapters` は 1 カーネル内で `server`(server-only)と `client`(use-client)の 2 面へ / 実行文脈を持たない規則は区画 `adapters/http` へ / RSC 境界は boundaries でなく `server-only` とゲートが見る |
| **A12** | 0025 | app レイヤの element 構成 | ✅ | ✅ | A3, A4 | `app` を route-segment / route-handler / server-action / metadata の 4 役割へ分割(Pages Router 不採用)/ element ごとに許可 import 先を宣言 / 強制の届く範囲を行ごとに示し、届かない分は指針と明記する |
| **A13** | 0026 | layout の横断 UI / Provider mount | ✅ | ✅ | A12 | root layout は app シェル(nav / footer / toaster / Provider)の薄い mount 点で `page.tsx` は `features` のみ / 横断 UI 状態の帰属を mount と対で確定 / route group は shell とジャーニーの単位であり、跨ぐ遷移へ client 状態を持ち越さない |
| **A14** | 0029 | 型設計の規律 | ✅ | ✅ | A3 | 状態は判別可能 union で表す / 境界で 1 度だけ parse し確定型を内側へ渡す / client へ届くスキーマは `zod/mini`・server に閉じるものと生成物は `zod` / 識別子は branded type / 型は `satisfies` で確かめ注釈で潰さない |
| **A15** | 0031 | ポリシー状態の供給方針 | ✅ | ✅ | A9, A10 | consent / flag の供給を「生値の読み / セマンティクス + no-op 既定 / ツリーへの供給」の 3 つへ分解し既存カーネルへ(新カーネル不要)/ 供給の既定は stateless、反応的な横断だけ `stores` / 家は依存マトリクスが先に決める |
| **A16** | 0041 | Cache Components(PPR)有効化判断 | ✅ | ✅ | A4, B28 | `cacheComponents: true` を採用 / 器の形が殻と穴の分かれ目になり segment config は併存しない / 殻を配れない route だけが `instant = false` を名乗り、宣言と実態を突合 / 代償(可逆性・一次資源の不在が 200 になること・build のバックエンド到達性)を引き受ける |
| **A17** | 0042 | React 19 レンダリング API 規約 | ✅ | ✅ | A4 | ref as prop(`forwardRef` を新規に書かない)/ `use()` は境界前提の読取プリミティブ / `useEffect` は外部システム同期に限定 / React Compiler は基盤の必須にせず `annotation` で opt-in、印は購読の経路を数えて付ける |

### Tier 3 の de facto 状態

- **A1 / A3(ADR 0020 / 0021)**: `src/{app, features, model, components, adapters, capabilities, stores, config, errors, logging, observability}` の 11 カーネルと層別 README は実装済み。命名規律・カーネル受入基準・依存マトリクスは README に反映済みである。依存マトリクスの機械強制も着地しており、`eslint.config.ts` の `boundaries/dependencies`(`default: disallow`)・`no-unknown-files`・`no-unknown-dependencies` がいずれも `error`、`pnpm check:architecture` が `architecture.ts` を正として突き合わせ、どちらも `lint:ci` が回す。
- **A5 / A6 / A7(ADR 0027 / 0028 / 0030・実装 ✅)**:
  - **A5 = [ADR 0027](0027-directory-structure.md)**: 物理レイアウト・`@/*` alias 追認・co-location (feature 内フラット共置 / テストは実装隣接・`__tests__` 集約否定 / スタイルは Tailwind 既定)・共有粒度 (per-file 基本 → 肥大時 per-folder)・物理作成タイミング (空ディレクトリ禁止)
  - **A6 = [ADR 0028](0028-naming-convention.md)**: 命名優先順位 = **Next.js 規約 > React 規約 > nextjs-boilerplate 自身の既存規約・業界スタンダード**(go-boilerplateは命名の権威に置かない)。ファイル名は**全ソース kebab-case 統一**(Next.js は特殊ファイル以外を unopinionated → 業界スタンダード/shadcn/FS 安全性/自リポ既存の小文字ファイル。従来型 React の PascalCase コンポーネントファイルは不採用)・特殊ファイル/route は Next.js 小文字規約(`[slug]`/`(group)`/`_folder`)・識別子は React 規約(component=PascalCase 等・`I` プレフィックス禁止)・環境変数 `{SUBSYSTEM}_{NAME}`・ADR ファイル `NNNN-kebab`(自リポ既存規約 `docs/adr/README.md`・採番方式はトピック順ブロック帯で確定〈2026-07-14・0001〜0155〉。`Dev-`/`Toolchain-` は数値列へ畳み込み)・テストファイル命名は B8 へ引き渡し。カーネル命名規律は 0021 が正
  - **A7 = [ADR 0030](0030-environment-variable-management.md)**: env/config の翻案方針 (全 ENV 検証 = ビルド時 + サーバ起動時のみ / `#` private + getter の不変 Config / server・client 分割 / `process.env` 直読は config モジュールのみ・biome `noProcessEnv` 強制 / 配布 = ESM シングルトン + import 境界 / 受け手 4 分類 / no-Docker のため embed → Next.js native `.env` + PaaS secret store)。討議経緯は docs/plan 統合(2026-07-18)で破棄(git 履歴参照)。決定は ADR [0030](0030-environment-variable-management.md) が正
  - 3 本とも着地済み。A5 の物理ディレクトリと層別 README、A6 の命名規則、A7 の `src/config/`(目的別に 10 モジュール)が実在し、依存マトリクスの機械強制は `eslint-plugin-boundaries` + `pnpm check:architecture` が `architecture.ts` を正として行う
- **A4(ADR 0040・実装 ✅)**: App Router 単独 / Server Components 既定 / `"use client"` は feature 葉へ押し下げ / Server Actions = `actions.ts` / page = 薄い driving adapter / レンダリングモード非強制。`src/app/` は route group・parallel route・error 境界・Route Handler まで実在し、Cache Components は `next.config.ts` で有効(`cacheComponents: true`)。キャッシュの設計そのものは B3、境界の粒度は B6 が持つ
- **A2(ADR 0070・実装 ✅)**: Next.js = UI + 薄い BFF / `/api/*` = thin proxy・業務ロジック禁止 / ドメインはバックエンド / 契約 SSOT = backend の `openapi.gen.yaml` / 境界値所有(response 検証はフロントが最後の砦)/ 認証・セッションの具体はテンプレートから用途依存。`src/app/api/**/route.ts` の薄い口、`src/adapters/server/http/` の fetch wrapper、`openapi/` の契約取り込み(`make gen-api`)まで実在する。**Tier 3(A 系)はこれで全 ADR 化完了**

---

## Tier 4: 実装方針

UI / スタイリング / データ統合 / 状態管理 / エラー / 観測性 / テスト / CI / セキュリティ 等、アーキテクチャ基盤の上に乗る具体実装の方針。

| 枠 ID | ADR # | タイトル | 選定済み | 実装済み | 依存 | 内容要旨 |
| --- | --- | --- | --- | --- | --- | --- |
| **B1** | 0050 | スタイリング戦略 | ✅ | ✅ | A5 | Tailwind 主軸 / CSS Modules 限定許可(styled-components・emotion 非採用)/ design token = CSS 変数 / `cn()` = `clsx` + `tailwind-merge`(`components` カーネル内)/ variant 定義 = `cva` / global は `globals.css` 集約 |
| **B2** | 0052 | UI コンポーネント方針 | ✅ | ✅ | A5, B1 | **v1 バッテリー採用(2026-07-14 反転)**: shadcn/ui + @tabler/icons-react + 複雑入力 + リッチテキスト(TipTap)を採用(`components` カーネル・vendor 越し差替可能。0010 / 0004)/ アイコンの供給元は `src/components/icon.ts` 1 ファイルへ閉じる/ variant 定義は `cva`。旧「非同梱」から反転 |
| **B3** | 0071 | BFF / API 統合 | ✅ | ✅ | A2, A4, A5 | API クライアント = `adapters` / fetch wrapper に go 0019 resilience を広く翻案(dual timeout / idempotent retry / retry budget / circuit breaker)/ 生 status を errors へ正規化 / response は adapters 境界で zod 検証 |
| **B4** | 0072 | 型生成 (API スキーマ) | ✅ | ✅ | A2, B3 | backend `openapi.gen.yaml` から **orval で zod + 型生成**(型 + runtime validation)/ `gen/` do-not-edit / gh 取込 + short SHA スタンプ / 型漏洩禁止(adapters 変換)/ drift ゲート |
| **B5** | 0060 | 状態管理 | ✅ | ✅ | A3, A5, B3 | Server state = Server Component fetch 既定 / Client state = local から / **v1 バッテリー採用(2026-07-14 反転)**: react-hook-form + zod / Zustand(横断 client 状態は `stores` カーネル 0023)/ **`nuqs` 等 searchParams ヘルパは v1 不採用**(標準形は scaffold 生成で担保)。旧「非同梱」から反転 |
| **B6** | 0080 | エラーハンドリング | ✅ | ✅ | A4, A5, B3 | errors カーネルの protocol-agnostic 分類・cause chain・redact・Meta を実装済み。adapters 境界での生 status 正規化(1 回)と App Router のエラー境界は後続 PR で実装する |
| **B7** | 0081 | 観測性 / ロギング | ✅ | ✅ | A2, A5, B3 | server-side logging/observability カーネル / 抽象ロガー(ctx-native・trace_id 自動注入)/ OTel vendor-neutral OTLP-only / signal 別 config gating / 公式 semconv のみ。ブラウザ→BFF 中継 seam で Web Vitals と client の未捕捉例外を集約 / **RUM SaaS は用途依存(exclusion)** |
| **B8** | 0090 | テスト戦略 | ✅ | ✅ | A3, A4, A5, A6 | Vitest + RTL + MSW + Playwright / go 準拠戦略(co-location・正常系異常系・table-driven 禁止)/ 100% ハードゲート / integration=HTTP 境界 mock / 二層実行(CI 厳格 / hook 高速)/ 命名は 0028 kebab。Playwright は story 単位の visual regression と、画面を通した E2E ジャーニー・画面単位の比較の双方に載る |
| **B9** | 0153 | CI 構成方針 | ✅ | ⚠️ | A7, B8 | 1 関心事=1 workflow(lint/typecheck/build/test/e2e)/ SHA ピン + concurrency + 最小 permissions / hooks mirror CI / upsert-pr-comment / matrix 非採用(単一 ubuntu・mise SSOT) |
| **B10** | 0110 | セキュリティ運用 | ✅ | ✅ | T4, B9 | Dependabot cooldown(patch5/minor7/major30・security 即時)/ gitleaks fail-closed / Trivy fs 二段(dev advisory・release strict)/ pnpm audit(severity high+ / 修正可能性で blocking。到達性フィルタは現行ツール非対応)/ SECURITY.md / **CSP 適合ゲート**(配信ヘッダと 0111 宣言の突合・fail-closed)/ **image-scan・cosign・SBOM は no-docker で exclusion** |
| **B11** | 0051 | スタイリング体系 | ✅ | ✅ | B1 | token は primitive / semantic の 2 層で SSOT は `tokens/*.json` / 参照面の既定は semantic、配色と系統は別名の再束縛だけで切替 / レスポンシブは mobile-first + コンテナクエリ / モーションは CSS・View Transitions 既定で reduced-motion 尊重 / 印刷の面も持つ |
| **B12** | 0053 | インタラクション a11y seam | ✅ | ✅ | B2 | プラットフォーム built-in をライブラリより先に置く / 複雑入力の相互作用 a11y 契約 / リッチテキストは TipTap + 差替可能な sanitizer port を `model` へ / sanitize 済みを nominal type で表し迂回経路を型から消す / 許容範囲の違う sanitizer は別パッケージへ |
| **B13** | 0054 | UI カタログ(Storybook) | ✅ | ✅ | B2 | Storybook を部品の唯一の在庫リストとし story を持たない部品を作らない / story は主題で数え 1 部品 15 主題を上限 / 画面まるごとの story は route と同じ器で包む / server の無い面では外部の口だけを差し替える / a11y 自動検査を story 全数へ |
| **B14** | 0055 | デザインシステムの外部書き出し | ✅ | ✅ | B11, B13 | `pnpm design:bundle` が registry item / 目録 / semantic token の 3 つを tool 非依存で出す / 送り先を知るのは skill だけで script は知らない / 依存の向きは repo → design の一本で書き戻さない / bundle は生成物であり追跡しない |
| **B15** | 0061 | フォーム送信フローの canonical 機構 | ✅ | ✅ | A4 | `<form action>` + `useActionState` + `useFormStatus` を既定形とする / 戻り値契約 `ActionState<T>` を `model` が所有し、入力検証と結果通知はこれを入力に取る / pending 表示を送信フローの一部として要求する |
| **B16** | 0062 | フォーム入力検証 UX | ✅ | ✅ | B15 | 誤りは focus が外れた時点で出し、focus 中は消す方向にだけ効かせる / 候補から選ぶ項目に既定の選択を置かない / 表示規則(`model` の手書き zod)と契約検証(`adapters` 境界)の二層分離 / 生成スキーマは client へ載せず契約由来の定数だけを引く |
| **B17** | 0063 | 変更結果の通知 UX | ✅ | ✅ | B15 | フォーム文脈に留まるならインライン、離れるならトースト、遷移するなら redirect + 再検証 / インラインは全体の要約と欄ごとの文言の両方を出す / 出し分けは失敗の種類で行い文言では行わない / live region の a11y 要件 |
| **B18** | 0073 | ページネーション・取得境界 | ✅ | ✅ | A11, B3 | cursor 既定(offset は安定した集合とページ番号ジャンプに限る)/ ページ状態は searchParams で RSC 駆動 / 条件が変われば読み進めた位置は捨てる / 無限スクロールは限定した明示例外で増分取得の所有は `adapters/client` / 積み上げを捨てる判断は置く側が React の鍵で表す |
| **B19** | 0074 | 双方向 / ストリーム通信 seam | ✅ | ✅ | A11 | 長寿命接続の hosting は非同梱(別ドメイン責務)/ 購読 seam は `adapters/client` が所有し `errors` へ正規化 / 順序・重複・再接続・cursor は transport 都合、ドメインイベントの畳み込みは feature / transport は SSE 既定で真に双方向のときだけ WebSocket |
| **B20** | 0075 | ファイルの受け取りと配信 | ✅ | ✅ | A7, A12 | 受け口は Server Action 1 つで `/api/*` に中継専用の口を作らない / 上限と宣言された種類の検査を置き、上限は起動時設定から引いてフレームワーク側の上限も同じ値から導く / 配信は公開の配信元で、主体ごとに見せる相手が変わるものを載せない / 署名付き URL への直接送信は採らない |
| **B21** | 0076 | 決済 UI seam | ✅ | ⬜ | — | **exclusion**: 決済 SDK 本体も mount seam の実体も非同梱(設置面の無い seam は腐る)/ 記すのは採用時の座標(SDK の DOM マウント点 + client_secret 受け渡し口)だけ / PCI 境界(生カード情報をフロントに持たせない)は採否によらず不変 |
| **B22** | 0077 | BFF abuse 保護境界 | ✅ | ✅ | B7 | レート制限 / bot フィルタ / DDoS 緩和 / WAF は infra(PaaS・edge)責務として境界 seam で切る / 本体が残す最小防御は Route Handler の content-type 検証・本体サイズ上限・入力検証 / 参照形はテレメトリ中継(415 / 413、宣言された長さで先に落とす) |
| **B23** | 0078 | 動的 feature flag seam | ✅ | ⬜ | A15 | **exclusion**: flag / A-B / 段階的配信の SaaS 本体は非同梱で seam もコードとして置かない / 評価場所の既定は server(bundle から排除できること・flicker と CLS の回避の 2 根拠)/ 再デプロイ単位で凍結する値は env、再デプロイなしで変える値は BFF runtime config へ逃がす |
| **B24** | 0079 | 認証のフロント側 seam | ✅ | ✅ | A11, C6 | session は httpOnly cookie に置き payload は最小 / 認可は 2 層で、楽観は `proxy.ts`(cookie 読みのみ・データ源参照禁止)、確定はデータ源直近の `verifySession()`(`adapters/server` + `cache()`)/ 画面へ渡すのは DTO / 実装方式(JWT 風 / session id)は定めない |
| **B25** | 0082 | クライアント観測性 | ✅ | ✅ | B7 | ブラウザ発の経路をすべて BFF 中継 seam に載せる / 送信面は `adapters/client`、受けは `route.ts` → `adapters/server` / ブラウザの trace は `fetch` すべてを包み OTLP のまま渡す / Web Vitals は metric、client の未捕捉例外は log / プロダクト分析の発火 IF は置かない |
| **B26** | 0091 | テスト検証手段方針 | ✅ | ✅ | B8 | async RSC は `render(await Component(props))` で unit へ寄せ、取得は `vi.mock` で module 境界ごと差し替える / 通しでしか確かめられないものだけ integration・E2E へ / a11y は component 層 `vitest-axe` + story 全数を実ブラウザの axe で 1 テーマ / VRT と a11y は spec も job も分ける |
| **B27** | 0111 | CSP・セキュリティヘッダ | ✅ | ✅ | A7 | 要求内容に依らない静的ヘッダは `next.config.ts` の `headers()` で全経路へ付け、組み立ては `config/security-headers` が持つ / HSTS は https 配信時だけ出す / 標準は W3C・IETF でブラウザが enforce する多層防御 / 適合は組み立ての単体検査と実ブラウザでの違反監視で見る |
| **B28** | 0112 | データ分類とキャッシュ境界 | ✅ | ✅ | B3 | 分類はラッパ型ではなく取得の口(`createHttpClient({ scope })`)に持たせ、受け取れる引数を分類ごとに変える / public は `cache` / `tags` を、user-scoped は資格情報を、互いに型として持たない / 事故が起きる面はキャッシュ投入と client 引き渡しの 2 箇所に集中する |
| **B29** | 0113 | 開発用の口の制御面 | ✅ | ✅ | A7, B24 | 制御面は到達したい状態の集合で決め、実システムのポリシーで狭めない(役割の直接指定 / 失効秒数 / 無指定は最弱)/ 危険は口を開ける環境の判定(`APP_ENV` + 宛先)で閉じ、一覧は 1 か所に置く / 成果物から口ごと外す拡張子分離と実行時判定の二重 |
| **B30** | 0157 | 検査の宣言規律 | ✅ | ✅ | — | 成立しなかった検査を「違反なし」へ倒さない(fail-closed / 件数の突き合わせは単位ごと / 走査範囲を狭めて時間を縮めない)/ 欠損するフィルタ越しに結果を報告しない / 除外・抑止は 1 箇所へ宣言し理由と撤去条件を持たせる / 抑止を足したことを差分へ出す |

### Tier 4 の de facto 状態

- **B1(ADR 0050 として実装 ✅)**: 2026-07-12 に [ADR 0050](0050-styling-strategy.md) として成文化(2026-07-14・v1 でバッテリー採用へ部分改訂 = Tailwind 主軸 / CSS Modules 限定許可・styled-components・emotion 非採用 / `cn()` は `components` カーネル内 / design token = CSS 変数 / global は `globals.css` 集約)。`tokens/*.json` を SSOT とする CSS 生成・drift gate・`cn()` に加え、variant 定義の `cva` と design token の値が着地したため ✅ とする
- **B2(ADR 0052 として実装 ✅)**: shadcn/ui を取り込んだ `src/components/` の design-system / patterns / app-starter / shell、`src/components/icon.ts` へ閉じた Tabler のアイコン、Radix ベースの複雑入力、TipTap の `RichTextEditor` と sanitize 済み表示の `RichTextContent`、`cva` による variant 定義を実装済み。取り込みの台帳は `shadcn-manifest.yaml` が持ち、上流追従の drift 検出を CI へ載せている
- **B5(ADR 0060 — 2026-07-14 に v1 バッテリー採用へ反転・実装 ✅)**: B2 と同じく、当初(2026-07-12)は本体非同梱の exclusion だったが、**v1 = 一般的 Next.js アプリ基盤として必要ライブラリを採用**の方針転換で反転。0060 = react-hook-form + zod / Zustand(横断 client 状態は `stores` カーネル [0023](0023-stores-kernel.md))。Server state = RSC fetch 既定 / Client state = local から、は不変。ライブラリの導入と `stores` の実体化(同意状態 / 通知)は着地済み。詳細は `docs/plan/master-plan.md` の採用ロードマップ節
- **B8(ADR 0090 として実装 ✅)**: Vitest + RTL + MSW + `vitest-axe` を導入し、co-location・正常系 / 異常系・table-driven 禁止の規約、`make test-cached` / `make test-full` の二層実行、100% coverage gate と CI の PR レポートを実装済み。Playwright は story 全数の visual regression(`make vrt`)に加えて、画面を通した E2E ジャーニー・ブラウザが報告する異常の見張り・帯ごとの出し分け・3 つの描画エンジン・画面単位の比較(`make e2e` / `e2e/`)も持つ。どちらも digest 固定した公式イメージ内で実行し、基準画像の置き場を共有する
- **B3 / B4(ADR 0071 / 0072・実装 ✅)**: 2026-07-13 に決定 4 バッチとして成文化。B3 = [ADR 0071](0071-bff-api-integration.md)(API クライアント = `adapters` / fetch wrapper に go ADR 0019 resilience を広く翻案 = dual timeout + idempotent retry + retry budget + circuit breaker / 生 status を errors へ正規化・詳細テーブルは B6 / response は adapters 境界で zod 検証 / SSRF guard は外部叩き時のみ)。B4 = [ADR 0072](0072-api-type-generation.md)(**型 + runtime validation を orval で zod 生成** — 決定 4 当初の openapi-typescript 型のみから、go 境界値所有哲学に合わせユーザが変更 / `gen/` do-not-edit / gh 取込 + short SHA スタンプ + マニフェスト / 型漏洩禁止 = adapters 変換 / drift ゲート)。取込 + 生成パイプラインは `scripts/openapi/`、生成物は `src/adapters/gen/`、drift ゲートは `gen-drift` が持つ
- **契約と実物の食い違いが 1 件見つかっている(B4)。** 実バックエンドへ繋いで `/mypage` を開くと、`/v1/users/me/purchases/summary` の応答が生成 schema と一致せず(`period` が無い)、`adapters` の境界検証が `internal` を投げて画面が落ちる。**契約を取り込み直して、どちらが古いのかを確かめる**のが次の作業である。 <!-- sample:line -->
- **同じ downstream への client が分かれている(B3)。** `createHttpClient` は呼び出しごとに circuit breaker と retry budget を新しく作るため、同じ backend へ client を分けた数だけ劣化の判断が割れる([0071](0071-bff-api-integration.md) の per-downstream)。public 側は `adapters/server/api/public-client.ts` へ集約済みだが、**user-scoped 側は 7 モジュールがそれぞれ自前で組んでいる**。集約するなら「資格情報の取得口を渡す形」を 1 か所へ寄せることになり、[0112](0112-data-classification-cache-boundary.md) 決定 5 の `no-captured-bearer-token` と正面から交差するので、まとめて決める。
- **B6(ADR 0080・実装 ✅)**: `errors` カーネルに protocol-agnostic な13分類、cause chain、明示指定の redact、分類と code・文言・詳細識別子を分離する `Meta` を実装済み。分類は Go の `apperror` と同じく内層に保持し、外側の `Meta` を優先する。生 status の分類と未知エラーの `internal` 正規化は `adapters` の境界が 1 回だけ行い、`error.tsx` は区間ごとに、`global-error.tsx` と `not-found.tsx` は根に置いてある。ログレベルと出力は B7 が担う
- **B7(ADR 0081・実装 ✅)**: Node.js server 用に Pino の構造化 logger、trace/span ID の注入、秘匿フィールドの redaction、OTLP HTTP exporter、W3C trace context / baggage 伝播、`OBS_SERVICE_NAME` から供給する公式 `service.name`、HTTP request の trace、および signal 別の lazy 初期化を実装済み。`OBS_LOGS_EXPORTER=otlp` のときだけ Pino の正規化済みログを OTel Logs API へ渡す。local otel-lgtm で Tempo の trace と、同じ `trace_id` / `span_id` を持つ Loki の構造化ログを実送信確認済み。外向き `fetch` への trace context 注入は `APP_API_BASE_URL` と同じ origin に限り、外向き span からは URL の query を落とす。描画の計装は `OBS_RENDER_SPANS`(`none` / `screen` / `part`・既定 `screen`)で範囲を選び、`features` の最上位(`page-content` / `view`)と、`part` のときだけ feature が持つ部品(`ui/`)を span に載せる。注入は registered symbol 経由で渡す —— Next は起動境界と RSC を別のモジュールグラフとして組み、同じファイルが 1 プロセス内で 2 回インスタンス化されるため、モジュール変数では描画側へ届かない(`logging` の singleton が共有されていなかったのも同じ機序)。ブラウザ側は OTel の Web SDK で `fetch` すべて(BFF への取得に加え、router が画面遷移と先読みで出す RSC の要求)を span にし、その span を同一オリジンの BFF (`/api/telemetry/traces`) が OTLP のまま collector へ渡す —— ブラウザは自分の trace を始めず、root layout が配る `traceparent` を親に取るため、SSR からブラウザの取得、その先のバックエンドまでが 1 本の trace になる。計装は最初の描画の後に動的 import で読み、初期 JS への影響は +0.1 KB に留める。service 名は中継が上書きする(認証を要求しない口なので、ブラウザの名乗りを通すと任意の service へ書ける)。測定と例外は同じく BFF (`/api/telemetry`) が中継し、Web Vitals は指標ごとのヒストグラム(`browser.web_vital.*`)として、client の未捕捉例外は `exception.*` 属性を付けた構造化ログとして、画面を組んだ要求の trace へ紐づけて OTLP へ載せる —— 公式 semconv は web vitals へ event 名(`browser.web_vital`)しか与えていないが、event で出すと 1 レコードごとに中継の POST の span が付き、測定が起きていない要求と親子になるため metric を採る。中継の口は認証を要求しないので、content-type と本体サイズの最小防御を Route Handler が持つ([0077](0077-bff-abuse-protection-boundary.md) §2 が実装 PR へ保留していた分)。RUM SaaS は用途依存(exclusion)を維持する。
- **B9(ADR 0153・実装 ⚠️)**: [ADR 0153](0153-ci-configuration.md)(go workflows 翻案 / 1 関心事=1 workflow・SHA ピン・最小 permissions・hooks mirror / job は biome/tsc/next build/vitest/playwright / matrix 非採用)。lint / typecheck / build / test / smoke と生成物 drift・`uses:` の SHA ピン検査・ドキュメント配信の workflow、`upsert-pr-comment` 基盤を実装済み。visual regression(`vrt`)・画面を通した検証(`e2e`)・Core Web Vitals(`lighthouse`)・container image の digest ピン検査(`images-pin`)も追加済み。セキュリティ系 workflow(B10 側)も着地済み。**残る食い違いは required check の一覧で、`purge-verify` と `strip-verify` が載っていない** —— 0153 §5「CI Checks グループの job は全て必須」に対する差分はこの 2 つだけになった(`component-classes` と `shadcn-manifest` は登録済み)。`make required-check-lint` が見ているのは逆向き(登録済みの context が全 PR で報告されること)なので、この抜けは機械では鳴らない
- **B10(ADR 0110・実装 ✅)**: [ADR 0110](0110-security-operations.md)(go 0077 多層防御翻案 / Dependabot cooldown・gitleaks・Trivy 二段・CodeQL js-ts / **image-scan・cosign・SBOM は本リポ 0011 no-docker で exclusion**)
- **B10 の内訳**: ローカルは `mise.toml` + `make secret-scan` / `make trivy-fs`。**pre-push hook に載せるのは秘密スキャンだけ**で、脆弱性スキャンは意図的に接続していない([0110](0110-security-operations.md) 3.1 / 撤回条件 W2)。CI 側は `codeql` / `gitleaks`(履歴全体の週次を含む)/ `dependency-scan`(Trivy 二段 + `pnpm audit` ゲート)/ `osv-scan` / `sast` / `bearer` / `dast` / `scorecard` と Dependabot cooldown、`SECURITY.md` が揃っている
- **CSP の適合検査は 0110 が想定した形では着地していない。** 配信ヘッダを宣言と突合するゲートではなく、**組み立ての単体検査 + 実ブラウザでの `securitypolicyviolation` の見張り**(`e2e/lib/test.ts` / `e2e/journeys/csp.spec.ts`)になった。ヘッダを読むだけの検査は `Report-Only` へ緩めても通るが、こちらは通らない([0111](0111-csp-security-headers.md) §5)

---

## Tier 5: 機能・互換 (任意 / 用途依存)

i18n / a11y / パフォーマンス予算 / ブラウザサポート 等、アプリケーション基盤として「あれば望ましいが用途次第」の判断。

| 枠 ID | ADR # | タイトル | 選定済み | 実装済み | 依存 | 内容要旨 |
| --- | --- | --- | --- | --- | --- | --- |
| **C1** | 0121 | i18n 戦略 | ✅ | ⬜ | A4, A5 | **exclusion**: i18n ライブラリ本体非同梱(用途依存)+ 採用時の App Router seam(proxy.ts/`[locale]`) |
| **C2** | 0100 | アクセシビリティ目標 | ✅ | ✅ | A5, B1 | WCAG 2.x AA 目標 / biome a11y ルール活用(`lint:ci`)/ 手動チェックは UI feature 実装 PR 時 |
| **C3** | 0101 | パフォーマンス予算 | ✅ | ✅ | B1, B9 | 指標=Core Web Vitals / 計測は `lighthouse`(画面ごとの LCP・CLS・TBT。保護ブランチへの push と日次)と `bundle-budget`(route ごとの client JS。PR ごと)/ 閾値は `performance-budget.yaml` / **CLS だけが "good" 境界そのもの。LCP と TBT は同じ条件で測った床から導く lab の線**で、用途で動く bundle size は作った側 |
| **C4** | 0102 | ブラウザサポート行列 | ✅ | ⬜ | A4 | Next.js 既定 browserslist 追認 / polyfill は Next.js 委譲 / 切り捨て条件は作った側 |
| **C5** | 0045 | フォント・画像 | ✅ | ✅ | A4, A5, B1 | `next/font` / `next/image` 既定 / `public/` は静的公開アセット / 動的 OG は `ImageResponse` / **backend 由来画像 = public storage 前提・自前配信レイヤなし**(`mediaUrl()` + `remotePatterns` のみ・blur 非採用) |
| **C6** | 0043 | Middleware 方針 | ✅ | ✅ | A4, B3 | **Next.js 16 で Middleware→Proxy(`proxy.ts`)** / thin・last resort / 既定 Node runtime(`runtime` 指定不可・Edge 互換維持)/ 認証は作った側(optimistic のみ・確定認可はデータ境界) |
| **C7** | 0044 | SEO / メタデータ戦略 | ✅ | ✅ | A4, C5 | Metadata API 既定(`metadataBase`/`title.template`)/ `sitemap.ts`・`robots.ts` / `alternates.canonical` / JSON-LD 枠 / アイコン体系(0045 と責務分担)/ proxy matcher 除外 / 具体値は作った側 |
| **C8** | 0130 | PWA 戦略 | ✅ | ⬜ | C7 | **exclusion**: Web App Manifest / Service Worker / オフライン本体非同梱(用途依存)+ 採用時の `manifest.*` seam |
| **C9** | 0131 | Cookie 同意 | ✅ | ✅ | A2, C6 | **v1 採用(exclusion から反転)**: 軽量 consent 機構(同意状態保持 / バナー / スクリプト読み込みゲート / 計測 cookie_id)と、**ゲートの裏のタグマネージャ**を同梱 / **CMP・IAB TCF は非同梱**(一部 exclusion)。計測製品そのものは容器の中身として作った側が選ぶ / 状態供給は 0031 |
| **C10** | 0120 | ロケール対応フォーマット | ✅ | ✅ | A3 | 表示は `Intl.*`(ECMA-402)へ一本化 / 演算は `date-fns`(表示系関数と locale パッケージは使わない)/ ラッパは `model` カーネルへ閉じて vendor 直参照を散らさない / 暦の境界は固定ゾーンで解き、日付だけの値は `YYYY-MM-DD` の文字列で運ぶ |

### Tier 5 の状態

- **C2(ADR 0100・実装 ✅)**: biome の a11y ルールを `lint:ci` で error として運用し、component のテストへ `vitest-axe` の自動検査を、Storybook へ `@storybook/addon-a11y` を組み込み、`a11y` を必須チェックに載せてある。ADR が自動検査で拾えないと明記する手動チェック(キーボード操作・読み上げ・コントラストの実地確認)は UI feature 実装 PR ごとに行う運用であって、リポジトリに置く仕組みを持たない —— 凡例の 2 軸は仕組みの有無を見るので、これはステータスを下げる理由にしない
- **C5(ADR 0045・実装 ✅)**: `next/font` による font 読み込み、`next/image` を CSS のみの skeleton + `aspect-ratio` で包む `MediaImage`、backend 由来画像の経路(`mediaUrl()` + `next.config.ts` の `remotePatterns`。ワイルドカードを使わず検証済み ENV から組み立てる)、`ImageResponse` による動的 OG まで着地済み
- **C3(ADR 0101・実装 ✅)**: 画面ごとの Core Web Vitals(`lighthouse` / `scripts/lighthouse/`)と route ごとの client JavaScript(`bundle-budget`)の 2 つを CI のハードゲートに載せ、閾値と試行回数は `performance-budget.yaml` が根拠付きで持つ。開く画面は `e2e/lib/screens.ts` の宣言をそのまま使い、一覧を持ち直さない。**Lighthouse は PR ではなく保護ブランチへの push と日次で回す** —— 計測が直列でしか成立せず費用が `画面数 × 試行回数` に張り付くため、網羅ではなく頻度を削る判断(0101 §2)
- **C1 / C4(exclusion・追認のため実装物を持たない)/ C6(実装 ✅)**: 2026-07-13 に成文化。用途依存の Tier 5 のため多くは exclusion / 用途依存 / Next.js 組込み追認。C1=[0121](0121-i18n-strategy.md)(i18n exclusion)/ C2=[0100](0100-accessibility-target.md)(WCAG AA + biome a11y)/ C4=[0102](0102-browser-support.md)(Next.js 既定 browserslist 追認)/ C5=[0045](0045-fonts-and-images.md)(next/font・next/image)/ C6=[0043](0043-middleware-policy.md)(**Next.js 16 = proxy.ts**・thin・認証は作った側)。go はバックエンドで C 系にほぼ対応物がなく(フロント固有)、AGENTS.md も未策定領域の一覧を持たない(0152「未策定領域の扱い」)ため BACKLOG C 枠のみを根拠に成文化
- **C7 / C9(実装 ✅)・C8(exclusion)**: 2026-07-13 の敵対的レビューで、当初の C 列挙(C1〜C6)が**表示層の中心的関心事である SEO / メタデータ体系を取りこぼしていた**ことが判明し補完。C7=[0044](0044-seo-metadata-strategy.md)(Metadata API 既定 + `sitemap.ts`/`robots.ts` + canonical + JSON-LD 枠 + アイコン体系。0045 と責務分担)/ C8=[0130](0130-pwa-strategy.md)(PWA exclusion。沈黙だった線引きを明文化)/ C9=[0131](0131-cookie-consent.md)(Cookie 同意。**軽量機構 + スクリプトゲート + ゲートの裏のタグマネージャが v1 採用 / CMP・IAB TCF は非同梱**)。テーマ / ダークモードは新枠を立てず [0050](0050-styling-strategy.md)(B1)に「テーマ / ダークモード」節を追記(token 切替 + `prefers-color-scheme` 追従)。favicon / app icon の体系は C7(0044)がアイコン規約として吸収(0045 は静的 favicon の `public/` 配置のみ)

### 予算に対して残っている重さ (0101)

> client の zod は解消済み。生成物から定数だけを切り出し([0072](0072-api-type-generation.md))、client へ届くスキーマを `zod/mini` へ移した([0029](0029-type-design-discipline.md) §2)結果、client bundle の zod は **94 KB → 11 KB**、生成スキーマと `.describe()` の文言は 0 になった。再発は `scripts/client-schema-weight.gate.test.ts` が見る。

実測(gzip)。**ここに挙がるのは「測って分かっているが、まだ削っていない」ものだけ**で、削り方が決まっていないもの・順序が他に依存するものを置く。

- **全 route 共通の土台が 143 KB。** react-dom が 71 KB、Next.js の router が 29 KB を占める。フレームワークの費用であり、削る対象ではない
- **LCP と TBT の上限は、機械の速さを織り込んだぶんだけ緩い。** どちらも "good" 境界そのものではなく、床(`not-found`)+ 実行をまたぐ振れ + アプリへ割り当てる分で置いてある([0101](0101-performance-budget.md) 3)。振れの項が要るのは runner が実行ごと 3〜4.5 倍まで動くためで、**削れるのは「機械の速さを台ごとに割り戻す」機構が入ったとき**である。床は割った台すべてで測れているので、残るのは判定の側にそれを渡すことだけになる。field の値は RUM が別に持つ([0082](0082-client-observability.md))
- **`/checkout` の参考換算額が 1 描画で 3 回問い合わせられるのは、再試行である。** 描画 span を入れて採り直すと、3 本とも `checkout/confirm/page-content.tsx` の span の中にあり、応答は 3 本とも **503**(local の go 側で為替の供給元が未設定)。HTTP クライアントが `maxAttempts` まで再試行した結果であって、memo 化の失敗ではない。同じ trace で `getMyCart` / `getMyUser` は layout の取得と 1 回に畳まれており、`cache` は効いている。**供給元を立てた環境で 1 回に戻ることを確認する**のが残りの作業である <!-- sample:line -->
- **`next/dynamic` にした部品が、初回描画の直後に取得されている。** `wizard-form.tsx` は `<form action>` の送信で入力値を落とさないため全段を `hidden` で DOM に残し、`dynamic` はマウント時点で取得を始める。実測で、操作なしの初回読み込みで編集面(ProseMirror)と確認の段(sanitizer)のチャンクが取得されている。**最初に読む一式からは外れているので `bundle-budget` の数値は正しい**が、同じページを開いた人はそのバイトを払う。本当に遅らせるには「まだ到達していない段は中身を描かない」を器が持つ必要があり、入力欄を持つ段(値を残す必要がある)と読み取り専用の段(確認)で扱いを分けることになる
- **`/checkout` の `<Suspense>` が待つものの単位で切れていない。** 明細は外枠と同時に届くのに、profile と参考換算額を待つ同じ境界の中にある(0040 の境界の粒度)。CLS が 0.087〜0.112 と上下するのはこのため <!-- sample:line -->

### 機械的強制が文書に追いついていない箇所

[`docs/traceability.md`](../traceability.md)「機械が届かないと分かっているところ」が持つ。

---

## Tier 6: ドキュメント・メタ

ドキュメント運用 / portal / ライセンス 等、リポジトリ自体の運用に関する判断。

| 枠 ID | ADR # | タイトル | 選定済み | 実装済み | 依存 | 内容要旨 |
| --- | --- | --- | --- | --- | --- | --- |
| **D1** | 0140 | ドキュメント運用ポリシー | ✅ | ⚠️ | — | canonical 言語 = EN 目標・移行は v1(0.0.x は日本語 living)/ タクソノミー4分類(decision・exclusion=ADR / rule=rules.md 新設 / inventory=BACKLOG)/ ADR 不可変性(0.0.x living→v1 immutable)/ per-package README |
| **D2** | 0141 | ポータル運用 | ✅ | ✅ | D1 | `docs/portal/manifest.yaml` = 構造制御のみ(curated manual)/ コード README 手動登録・`docs/*` 自動発見 / GitHub Pages 配信 |
| **D3** | 0142 | ライセンス選定 | ✅ | ✅ | — | MIT 採用根拠(最大許容・エコシステム標準・go 統一)/ OSS 寄与 = inbound=outbound・CLA なし / 同梱ライブラリ整合は 0004 / `private:true` は publish ガードで MIT と両立 |
| **D4** | 0152 | AGENTS.md 構成方針 | ✅ | ✅ | D1 | ファイル配置 / 本文言語（+ 対訳 `AGENTS.ja.md`）/ 節構成と節を立てる判定 / Instruction Priority / 保護対象の機械強制 |
| **D5** | 0154 | Claude スキル運用方針 (運用系) | ✅ | ✅ | D4, G1, G2, T3, T4 | 配置・命名・frontmatter / 本文構造 / カバー範囲 / 商用操作前ユーザ確認 |
| **D6** | 0155 | Claude スキル運用方針 (開発系) | ✅ | ✅ | D4, D1, A1 | 配置・命名・frontmatter は D5 共通 / カバー範囲 / subagent パターン / `new-env` の Next.js 再設計 |
| **D7** | 0143 | 仕様書駆動 | ✅ | ✅ | A4 | 仕様書を持つのは画面(`src/app` の route)で置き場は `docs/spec/route/**` / 機能要件と画面要件の 2 層へ分ける / 契約・token・README は指すだけで写さない / 生成 scaffold は持たない / 突合は存在(機械)と内容(読み合わせ)の 2 つ |
| **D8** | 0144 | 決定と強制手段の併記 | ✅ | ✅ | — | ADR / `rules.md` / 実装タスクの issue / コードのコメントは、決定と同じ場所に強制手段を書く / 散文のままにするなら理由を付ける / 宣言だけでは担保にならず、その手段自身がどの経路で素通りされるかを言う / 集計は決定を持たない |
| **D9** | 0145 | docs-viewer のパッケージ境界 | ✅ | ✅ | B12, D2 | 許容範囲の違う allowlist を同じパッケージへ並べない / 独立 workspace パッケージとして Vite で静的にビルドし Next.js 固有 API を使わない / 依存の向きはビューアー → アプリ本体の一本 / 部品をコピーせず、デザインシステムの実利用者になる |
| **D10** | 0146 | 規約の参照と集計の生成 | ✅ | ✅ | D8 | `rules.md` の各節は英語固定語の錨を持ち、指す側はそこへリンクする(見出しから導かない / 一度付けたら変えない)/ 指す粒度は節 / `traceability.md` の集計は `rules.md` から生成し、手で数えた件数と手書きの表を置かない |
| **D11** | 0159-1 | 他リポジトリへの参照 | ✅ | ⚠️ | — | 既定は `redirect.github.com` を通し、上流へ公開のクロスリファレンスを残さない / 素のリンクは禁止ではなく留保し、使うときは相手リポジトリの言語でタイトルを書く / 素のリンクを使う判断は例外なく人間のもので、常設の委任もこの権限を移さない |
| **D12** | 0160 | エージェント環境の改善をループにする | ✅ | ✅ | D13 | 観測 → 改善 → 再計測 を 1 周とし再計測を省略しない / 所見を出すまでが機械で、何を取り込むかは人が決める / 決定的な集計を先に置き、モデルは「何が難しかったか」と関心への畳み込みだけ / 畳み込みは明示したときだけ走り、根拠の一覧を必ず持つ |
| **D13** | 0161 | 開発の窓をフィードバックの単位とする | ✅ | ✅ | — | 窓は作業の開始で開き、文脈が切れた時点(明示的な破棄 / 圧縮 / 終了)で閉じる / 閉じたことが所見を出す契機 / 窓は checkout ごと・実行ごとに独立 / セッション・コミット・PR・人の申告はいずれも所見の多い作業を優先的に落とすため母数に採らない |
| **D14** | 0162 | アプリケーションは AI に依存しない | ✅ | ⚠️ | — | 実行時 / ビルド / テスト / 必須チェックは、エージェントが居ない環境と `.claude/` の無い checkout で通る / AI への依存は成果物に現れないもの(スキル定義・静音実行・文脈量だけを変える道具)に閉じる / エージェント資産を検査する側は対象が無ければ 0 件で通す |

### Tier 6 の de facto 状態

- **D1(ADR 0140・実装 ⚠️)**: canonical 言語 = **EN 目標・移行は v1**(v1.0.0 未満は日本語 canonical のまま living)/ タクソノミー 4 分類 / `rules.md` への rule 集約 / ADR 不可変性 = v1.0.0 未満 living → v1 immutable / per-package README。着地済みなのは `docs/rules.md`・4 分類の判定([`docs/README.md`](../README.md))・per-package README・運用スキル(`canonicalize-doc` / `sync-readme` / `readme-review`)・英語 canonical の 2 例外が持つ対訳(`SKILL.ja.md` / `AGENTS.ja.md`)。**残るのは v1 境界でまとめて行う分だけ** —— `docs/**` の EN canonical 化と `docs/ja/` mirror への再編、および ADR の immutable 切替である
- **D2(ADR 0141・実装 ✅)**: `docs/portal/manifest.yaml` によるキュレーション、`scripts/portal/` の生成(判断は純粋関数・FS 入出力は CLI)、独立 workspace の `docs-viewer/`、GitHub Pages への配信 workflow を実装済み。`portal-manifest-sync` スキルも移植済みで、判定基準は `readme-review` を実行時に読む。配信先の設定(Pages を Actions 配信にし、`github-pages` environment へ配信元ブランチを許可する)は `make pages-delivery-apply` が持ち、`make setup-repo` が呼ぶ。**許可が無いと `docs-deploy` は job としては起動するが step を 1 つも実行せずに落ち、ログに理由が出ない** —— `docs-build` は緑のままなので、配信の緑赤は `deploy-docs.yaml` の `docs-deploy` の結果で見る
- **D3(ADR 0142 として策定済み)**: 2026-07-13 に成文化([ADR 0142](0142-license.md))。MIT 採用根拠(最大許容・エコシステム標準・go-boilerplate と統一・低儀式性)/ OSS 寄与 = **inbound=outbound・CLA なし**(DCO は必要時 `CONTRIBUTING.md`)/ 同梱ライブラリのライセンス整合は [0004](0004-library-management.md) 許可リストが担保 / `package.json` の `private:true` は npm publish ガードで MIT と別レイヤ・両立。**follow-up: `package.json` に `"license": "MIT"` 追加はルート設定保護のためユーザ指示待ち**
- **D6 ✅**: 開発系スキルは A7([0030](0030-environment-variable-management.md))の構造へ揃済。`new-env` が要求する `src/config/` は目的別に着地しており、スキル冒頭のガードは通る

---

## 明示的に boilerplate では決めない (out of scope)

これらは boilerplate 単体では決めず、作った側のプロジェクトでの個別判断に委ねる。

- **認証 / セッション戦略** — 作った側の要件に依存 (Vercel / Auth.js / Clerk / 自前 BFF / SaaS IdP 等)
- **DB / 永続化** — R1 (0011) の表示層ロールの対象外
- **デプロイ先の具体実装** — R1 (0011) で「PaaS 主想定」と決めたのみ。CI/CD の具体的なデプロイステップは作った側で扱う
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

本節は**枠 ID との紐づけと追跡ステータスの SSOT**。個々の移植作業の定義(輸入元 / 翻案メモ / 完了条件 / 依存)は `docs/plan/go-boilerplate-import-plan.md` が持つ。

対象スナップショット(2026-07-28): `go-boilerplate` `.claude/`(スキル 35 / エージェント 19 / 共有スペック 5)、`.codex/`(エージェント 19 / スキル 34)。以下の分類は **go 側の資産名**で列挙し、35 スキル / 19 エージェントを漏れなく網羅する。

### 移植済 / 対象外

- **移植済(既存)**(スキル 10 / エージェント 2): canonicalize-doc / commit / impl-review / new-env / readme-review / release-notes / submit-pr / sync-readme / tool-map / tools-upgrade、agent: adversarial-reviewer / review-verifier
- **移植済(A: 技術非依存)**(スキル 3 / エージェント 4): full-verify(+prompts+run.sh)/ full-apply / manage-skill(上乗せ規約を [0140](0140-documentation-operations.md) の対訳ペアと [0154](0154-claude-skills-operations.md) / [0155](0155-claude-skills-development.md) の配置・命名規約へ差し替え)、agent: arch-verifier / impl-verifier / doc-reviewer / comment-reviewer(godoc→TSDoc/JSDoc、正を AGENTS.md+一般原則へ)
- **移植済(B: 変換)**(スキル 7): node-upgrade(← go-upgrade。mise.toml SSOT のみ伝播)、repo-ops(器のみ。Docker/sqlc 項目は ADR 0011 で不適用)、actions-pin(GB-6。Go 実装を TypeScript へ書き換え。窓に捕まった候補は `supply-chain-triage` へ渡し、返ってきた帯を証拠としてユーザが判断する)、test-review(GB-5。Go の規約読み取りを [0090](0090-testing-strategy.md) / [0091](0091-test-verification-methods.md) と層 README の `test-requirement` の実行時読込へ差し替え)、scaffold-test(GB-5。ケースを対象の分岐から導き、対象は read-only。検証不能な分岐は skip せず切り出しの提案として返す)、scaffold-integration-test(GB-5。Echo + httptest を契約生成 MSW ハンドラへ翻案し、HTTP 境界のみへ限定)、portal-manifest-sync(D2。pair_drift preflight を落とし、N1 の除外先を godoc から Storybook + TSDoc へ、drift の機械検出を `portal:guides` / `portal:docs` の読み取りへ差し替え。判定基準は `readme-review` が SSOT)
- **対象外(D)**(スキル 2): `images-pin`([0011](0011-no-docker.md) no-docker)/ `scaffold-infra-db`(表示層に DB を持たない — [0070](0070-backend-role-separation.md))
- **本リポジトリ固有**: adr-scan(go 側に現存しない。走査を nextjs 化・枠 ID 体系へ分類 / PROVISIONAL)。上記の資産数には数えない
- **実行可能条件つき**: `new-env` は A7([0030](0030-environment-variable-management.md))の `src/config/` 構造へ再設計済。`src/config/` が着地したため実行可能
- **追随済**: `impl-review` は移植後に go 側 `impl-review` へ入った 4 機能(`test-gap` レンズ / `comment-reviewer` のライフサイクル組込 + 自動修正 / PR インラインコメント投稿 / モデル選択)へ追随済。`test-gap` のテストランナー有無ゲートは Vitest 導入により通過する
- **翻案済(`impl-review` / `adversarial-reviewer`)**: Step 1 の検出対象は [0027](0027-directory-structure.md) の物理レイアウト + [0021](0021-frontend-responsibility.md) の依存マトリクス(11 カーネル + 起動 / ビルド境界エントリ)、`architecture` レンズはマトリクス違反、`runtime-gap` レンズは RSC / Client 境界・生成成果物波及・`adapters` 境界挙動・キャッシュ再検証・`proxy.ts` matcher・CSP・Provider マウントへ差し替え済。Step 4 は **build 検証(常時)+ リクエスト検証(リクエスト時 seam に触れた時のみ)** の 2 段へ翻案し、バックエンド不在で塞がる経路は「到達不能」と明記させる。`verify-spec` / `scaffold-endpoint` への参照は削除(前者は GB-3 が採否未定、後者は GB-4 が翻案コスト最大で実体化未定)、網羅的レイヤ監査(GB-1)への言及のみ「本リポジトリに未実装」と明示した前方参照として残す

### 未着手(ADR 決定待ちなし)

ブロック元の枠がすべて Accepted で、**ADR の決定待ちによる停止は無い**。資産間の依存も残っていない。

| 資産 | 種別 | 依存 | 内容要旨 |
| --- | --- | --- | --- |
| `sync-ai` | スキル | — | `.claude/` ↔ `.codex/` の双方向同期(handoff スクリプト同梱) |
| `dep-vuln-upgrade` | スキル | — | CVE / GHSA を名指しした単発の依存更新。窓に捕まった版の判定は `supply-chain-triage` が持つ |

`.codex/`(エージェント 19 / スキル 34)は Codex 向けの並行資産で、上記の資産数には数えない。`.claude/` の完全なミラーではなく、現時点で `supply-chain-triage` が欠落し `arch-auditor-infra` の名が `arch-auditor-infrastructure` に振れている。基盤(`config.toml` / README)整備と全数ミラーは `sync-ai` と同時期に行う。

### 保留(C): ADR 決定待ちの移植計画

Go 側の本丸は **spec 駆動 scaffold + 層別監査体系**。今移植すると [`docs/rules.md`](../rules.md)「作業とエージェント」の「導出できないものは、逆に自分で決めない」に抵触するため、該当枠が **Accepted** になってから着手する。

| グループ | 資産 | ブロック元 | 着手トリガー | 翻案メモ(流用可能な骨格) |
| --- | --- | --- | --- | --- |
| GB-1 層別アーキ監査 | `arch-check` + `arch-auditor-{domain,usecase,controller,infra,pkg}` | A1 / A3 / A5 | A3 Accepted + 層別 README が `src/**` に整備 | 層マッピングを差し替えるのみ。並列 fan-out + 「自層 README を正として実行時読込」構造は流用可。full-verify Pass1 との分担を明記 |
| GB-2 層別ドリフト検出 | **着地済** — `back-prop` + agent `drift-detector` | — | 完了 | **エージェント定義は 1 つで、カーネルごとに並列起動する。**層ごとにファイルを置くと同じロジックを層の数だけ保守することになり、腐るのは写しのほうになる。検出は A/B/C/E の 4 種で、(D) は台帳が無いため不成立と本文に明記。判定基準は `skills/back-prop/prompts/detect-drift.md` が SSOT。`sync-readme`(構造の drift)とは交わらない |
| GB-3 spec 生成・検証 | `new-spec` / `new-spec-{domain,usecase}`、`verify-spec` + `spec-validator-{domain,usecase}`、`.claude/scaffold-spec/*`(5) | A1 / A3 | **採用**(v1 計画 P5-18)。**How は決着済み** —— 生成 scaffold は持たず、spec 先行も強制しない(翻案メモ) | **spec の置き場と 2 層構造は P5-5 で確定済み**(`docs/spec/route/**`。機能要件 / 画面要件の 2 層で、go の domain / usecase とは分け方が異なる)。**生成 scaffold は持たない。** spec は判断の散文であり機械可読な構造を持たない —— 生成器の入力にするには構造化データへ寄せることになり、spec の中心にある「やらない理由」が落ちる。加えて spec が書くのは**観測可能な契約であって機構ではない**ため、骨格を spec から導けない。`pnpm gen`(P4-6)の生成入力は `architecture.ts` + 層 README の 1 本に据え置く —— spec を第 2 の入力に足すと SSOT が二重化する。**spec は生成入力ではなく `new-feature` スキル(P7-3)の読み込み入力として扱う**。**輸入資産**: `new-spec` / `new-spec-{domain,usecase}` / `.claude/scaffold-spec/*` は生成 scaffold の資産のため**破棄**。`verify-spec`(spec と実装の突合)は生成と独立なので別枠とし、**着地済** —— ただし go の主題（YAML を持つ構造化 spec）はこちらに無いので、こちらの spec の形に対する検査へ改変した。[0143](0143-spec-driven-development.md) の 2 つの突合をそのまま実体に割り、**存在の突合は `scripts/spec-routes.gate.test.ts`（機械）**、**内容の突合は `verify-spec` + agent `spec-validator`（route ごとに並列）**。**spec 先行は強制しない** —— [`playbook`](../playbook.md) の画面実装の順序が仕様書を工程 5（レビューで見た目が確定した後）に置いており、先に固めると見た目が変わるたびに書き直すことになる。**未確定は無い** |
| GB-4 onion scaffold | `scaffold-endpoint` / `scaffold-domain` / `scaffold-usecase` / `scaffold-controller` | A1 / A2 / A3 / A5(+B3 / B4) | A1/A3/A5 + B3(BFF/API)+ B4(型生成)確定後 | Go の onion + sqlc/OpenAPI 前提はほぼ載らない(表示層に DB 無し)。流用は chain 構造と「gen 由来マッピングを name-match 導出 → 不能なら halt/hand-off」の骨格のみ。**翻案コスト最大** |
| GB-5 テスト scaffold/review | **移植済(3 資産すべて)** — `scaffold-test` / `scaffold-integration-test` / `test-review` | B8 | 完了(P4-0) | 「テスト観点を README から実行時導出」+ 2 段レビュー構造は流用可。`test-review` は既移植ワーカーを再利用。full-apply/node-upgrade/repo-ops の `pnpm test` 条件分岐も併せて見直す |
| GB-7 型設計レビュー | agent: `type-design-reviewer` | A3 | A3 Accepted + `src/model/` の型設計規約(層別 README + `docs/rules.md`)確定 | 4 軸ルーブリックは言語非依存。Go の非公開フィールド + getter / `New()` 不変条件検査を TypeScript の型表現へ読み替えるのみ。`arch-auditor` 系の二値判定では拾えない「規約は満たすが弱い型」を程度で拾う |

**分類合計**: スキル = 移植済 17 + 対象外 2 + 未着手 4 + 保留(C) 12 = **35**。エージェント = 移植済 6 + 保留(C) 13 = **19**。

**この合計はスナップショット時点(2026-07-28)の母数に対するものである。**次の資産はその 35 本に
含まれない。**合計を書き換えるにはスナップショットを取り直す必要があり、取り直さずに数だけ足すと
母数と分類が食い違ったまま権威として残る**（[0157](0157-inspection-declaration-discipline.md)）。

| 群 | 資産 |
| --- | --- |
| 問いに答える扉 | `repo-truth` / `how-to` / `question` / `research` |
| 運用 | `resolve-merge` / `new-issue` / `supply-chain-triage` |
| 宣言と実物の突合 | `back-prop` + agent `drift-detector`（GB-2）/ `verify-spec` + agent `spec-validator`（GB-3） |
| 語彙と接触点 | `glossary` / `context-map` / `context-map-audit`（IM-48 は「採る」で決着） |
| エージェント環境のループ | `closed-loop`（[0160](0160-agent-environment-loop.md) / [0161](0161-development-window-as-feedback-unit.md)）。宣言・打刻・集計・送出・読解・週次の測り直しまで一通り |

**推奨着手順序**(BACKLOG 依存順): A1 決定 → GB-4 翻案 / A3・A5 決定(層別 README 整備)→ GB-1・GB-2・GB-7 / B8 決定 → GB-5。各グループ着手時は該当枠が Accepted であることと Instruction Priority(ADR > BACKLOG > agent config)を再確認する。
