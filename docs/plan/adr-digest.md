# ADR ダイジェスト(2026-07 策定分)

新規策定 ADR 29 本の決定要点を 1 ファイルに集約した早見版。**正は各 ADR 本体**(`docs/adr/00NN-*.md`)であり、本ダイジェストは概観用。全体の状態ボードは `docs/adr/BACKLOG.md`。
生成日: 2026-07-13

## Tier 3: アーキテクチャ基盤(A 系)

### 0020 採用アーキテクチャ — Accepted(A1)

- **決定**: 全体パターンは **機能スライス × 表示層カーネル**(feature-sliced × presentation-layer kernels)。`src/` を 9 構成 = スライス(`app` / `features/<name>`)+ カーネル(`model` / `components` / `adapters` / `config` / `errors` / `logging` / `observability`)とする
- **決定**: 設計原則 = ①依存は内向きのみ ②境界は TypeScript 構造的型で表現 ③生成型・外部型を内層に漏らさない(型漏洩禁止) ④route / Server Action は driving adapter でコード分割の軸にしない(第一軸は feature) ⑤構造安全性は ESLint boundaries で CI 強制
- **決定**: go 語彙 `domain` / `usecase` は不採用。安定核は `model` へ縮退、画面ユースケースは feature 内へ共置。物理ディレクトリは対応決定が下りた時点で作成(空ディレクトリを生やさない)
- **禁止 / exclusion**: `src/domain/` `src/usecase/` 作成禁止 / driving adapter への業務ロジック禁止 / カーネルの外向き依存禁止。不採用パターン = onion 直訳(層形骸化)・Next.js 慣行ミニマル(監査体系が載らない)
- **関連**: 0011 / 0002 / 0021

### 0021 フロント内責務分離方針 — Accepted(A3)

- **決定**: 各カーネルの責務と依存マトリクスを確定(import 可: `app`→`features` / `features`→`model`・`components`・`adapters`公開面・`errors`・`logging` / `adapters`→`model`・`errors`・`logging`・`config` / `components`→`model`・`errors` / `model`→`errors` のみ)
- **決定**: `config` を import してよいのは `adapters` のみ(+起動/ビルド境界 `instrumentation.ts` / `next.config.ts` の例外)。`features ↔ features` 直接 import 禁止で、共有要素はカーネルへ昇格
- **決定**: 命名規律 = カーネルは役割名のみ許可、`common` / `shared` / `utils` / `lib` / `misc` 等は禁止名。カーネル受入基準(go pkg Policy 翻案 = 複数参照 or wrap のみ / 単一機能ヘルパは feature 内 / 単一責務 / ビジネスロジック禁止)
- **決定**: Enforcement = **`eslint-plugin-boundaries`** で層境界を機械強制、違反は `lint:ci` で error ブロック。9 カーネル+各 feature に層別 README を配置(監査の実行時読込元)
- **禁止 / exclusion**: マトリクス外 import / `features↔features` / `actions.ts` への業務ロジック / カーネルへの単一機能ヘルパ配置
- **関連**: 0020 / 0011 / 0002

### 0027 ディレクトリ構造 — Accepted(A5)

- **決定**: `src/` 直下は 9 カーネル。層跨ぎ import は tsconfig `@/*` → `./src/*` alias、相対 import は同一 feature / カーネル内に限る
- **決定**: co-location = feature 内はフラット共置(サブディレクトリなし)。テストは実装の隣に置き `__tests__/` 一括集約しない。共有粒度は per-file 基本 → 肥大時 per-folder 昇格
- **決定**: 物理ディレクトリは中身を伴う対応決定時に作成(`config`=A7 / `errors`=B6 / `logging`・`observability`=B7)。10 個目のカーネル増設は ADR 追補が必要
- **禁止 / exclusion**: 空ディレクトリ / `__tests__/` 集約 / 層跨ぎ相対 import / feature 内の不要なネスト / 汎用フォルダ(`common` / `utils` 等)作成
- **関連**: 0020 / 0021 / 0028 / 0030

### 0028 命名規則 — Accepted(A6)

- **決定**: 命名優先順位 = Next.js 規約 > React 規約 > 本リポ既存規約・業界スタンダード(go は命名の権威に置かない)
- **決定**: ファイル名は**全ソース kebab-case 統一**(`user-card.tsx`→`UserCard`)。Next.js 特殊ファイル(`page.tsx` / `layout.tsx` 等)と route セグメントは Next.js 小文字規約(`[slug]` / `[...slug]` / `(group)` / `_folder`)
- **決定**: 識別子 = component は PascalCase / hook は `use`+PascalCase / 関数・変数 camelCase / 型は PascalCase(`I` プレフィックス禁止)/ 真の定数 UPPER_SNAKE_CASE。環境変数 `{SUBSYSTEM}_{NAME}`(ブラウザ露出は `NEXT_PUBLIC_`)。ADR ファイルは `NNNN-kebab-case-title.md`(採番方式はブロック帯で確定〈2026-07-14・0001〜0155〉)
- **禁止 / exclusion**: ファイル名の PascalCase / camelCase(`UserCard.tsx` 等)・ケース混在・型の `I` プレフィックス・特殊ファイル/route への独自命名
- **関連**: 0027 / 0021 / 0030 / B8(テストファイル拡張子の確定先)

### 0030 環境変数管理 — Accepted(A7)

- **決定**: 全 ENV を検証対象とし、検証実行点は **ビルド時(`next.config.ts`)+ サーバ起動時 1 回(`instrumentation.ts` の `register()`)のみ**。リクエスト経路・ブラウザでの実行時検証は禁止
- **決定**: 参照は class の `#` private フィールド+getter の不変 Config 経由。`process.env` 直読は config モジュール 1 箇所のみ(biome `noProcessEnv` で強制)。server/client 分割(`src/config/server.ts` は `import "server-only"` / `client.ts` は `NEXT_PUBLIC_` 静的ドット参照のみ)
- **決定**: 配布 = ESM モジュールキャッシュのシングルトン + import 境界(config import は `adapters` のみ)。default-vs-required 統治 / Secret ラベル(required / recommended)/ 受け手 4 分類。供給は Next.js 標準 `.env` + PaaS secret store(no-Docker 整合)
- **禁止 / exclusion**: リクエスト内/Client での env 検証 / config 外からの `process.env` 直読 / setter 保持 / `client.ts` の動的アクセス・分割代入 / secret を `NEXT_PUBLIC_` に / RSC→Client への server config props 渡し。React taint API は experimental のため現時点不採用(stable 化で有効化)
- **関連**: 0020 / 0021 / 0011 / 0028 / 0002 / 0090

### 0040 ルーティング・レンダリング戦略 — Accepted(A4)

- **決定**: App Router 単独(Pages Router 不採用)/ Server Components 既定。`"use client"` は feature 内の葉コンポーネントへ押し下げ、`page.tsx` / `layout.tsx` は Server のまま
- **決定**: Server Actions 採用(`"use server"`、feature 内 `actions.ts`、編成のみ・業務ロジック禁止)。`page.tsx` = 薄い driving adapter
- **決定**: レンダリングモード(CSR/SSR/SSG/ISR)は一律強制しない。Next.js 16 の `fetch` 既定 uncached を前提にキャッシュは opt-in。具体キャッシュ設計は B3、`loading.tsx` / `error.tsx` 配置は B6 へ委譲。`Cache Components`(PPR 既定化)有効化は保留
- **禁止 / exclusion**: Pages Router 追加 / driving adapter への業務ロジック / `"use client"` の上位配置 / 分割第一軸を route にする / 特定レンダリングモードの一律強制
- **関連**: 0020 / 0021 / 0011 / 0060 / 0090

### 0070 バックエンドとの役割分離 — Accepted(A2)

- **決定**: Next.js は **UI 描画 + 薄い BFF** に責務限定。ビジネスロジック・ドメイン・永続化はバックエンド別リポ。表示層に残るのは表示用 `model` のみ
- **決定**: `/api/*`(Route Handler)は thin proxy に限る(プロキシ / 認証トークン中継 / 最小ヘッダ)。業務ロジック・重い集約禁止。認証・セッション具体は fork 先判断
- **決定**: 契約 SSOT はバックエンドリポの `openapi.gen.yaml`(REST + OpenAPI)。境界値所有(go ADR 0015 翻案)= 方向不変条件 **request ⊆ domain ⊆ response**。response には server 側検証がないため**フロントの生成 validation(zod)が契約破れ検知の最後の砦**で、`adapters` 境界で runtime validation
- **禁止 / exclusion**: `/api/*` への業務ロジック / `src/` への DB・ORM / API spec の手書き複製 / 特定認証モデルの本体組込 / 生成型・外部型の内層漏洩
- **関連**: 0011 / 0020 / 0021 / 0071 / 0072

## Tier 4: 実装方針(B 系)

### 0050 スタイリング戦略 — Accepted(B1)

- **決定**: Tailwind CSS(v4)ユーティリティ既定。`cn()` ヘルパ採用で置き場は `components` カーネル内。design token は CSS 変数、global CSS は `src/app/globals.css` に集約
- **決定**: テーマ / ダークモードは CSS 変数 token 切替 + `prefers-color-scheme`(Tailwind `dark` variant)。カラーパレット・トグル UI の有無は fork 先判断
- **禁止 / exclusion**: CSS Modules / styled-components / emotion 等の代替導入 / `cn()` を `components` 以外の汎用置き場へ / ユーティリティで賄える規則の `globals.css` 積み増し
- **関連**: 0021 / 0027 / 0052 / 0060

### 0052 UI コンポーネント方針 — Accepted (exclusion)(B2)

- **決定 / exclusion**: UI コンポーネントライブラリ(shadcn/ui 等)・アイコンライブラリ・form コンポーネント群を **boilerplate 本体に同梱しない**(用途依存 = fork 先判断)。本体 UI は Tailwind ユーティリティ + 最小の自前 UI で構成
- **関連**: 0050 / 0021 / 0011 / 0060

### 0060 状態管理方針 — Accepted (一部 exclusion)(B5)

- **決定**: Server state = Server Component 内 `fetch` 既定。Client state = local state(`useState` / `useReducer`)起点、Context 濫用回避、URL state は Next.js 標準機構
- **禁止 / exclusion**: グローバル状態ライブラリ(Zustand / Jotai / Redux 等)/ form state ライブラリ(react-hook-form 等)を本体同梱しない(fork 先判断)
- **関連**: 0040 / 0021 / 0011 / 0052

### 0071 BFF / API 統合 — Accepted(B3)

- **決定**: API クライアント(fetch wrapper)は `adapters` カーネルに配置、生 `fetch` を散らさない。生成型・zod スキーマの変換もこの境界で所有
- **決定**: fetch wrapper resilience(go ADR 0019 翻案)= dual timeout(per-attempt / overall、`AbortSignal`)/ idempotent retry(GET・PUT・DELETE retryable、POST・PATCH は opt-in、exponential backoff + full jitter、`Retry-After` 尊重)/ retry budget(token bucket 既定 10%)/ circuit breaker(closed・half-open・open)
- **決定**: 生 HTTP status は上位に漏らさず `errors` カーネル分類へ正規化(詳細テーブルは B6)。response は `adapters` 境界で zod `.parse()` 検証。SSRF guard は外部叩き時のみ
- **禁止 / exclusion**: コンポーネントへの生 `fetch` 散布 / 生 status 漏洩 / 非 idempotent の無条件 retry / retry budget・breaker なし retry / adapters への業務ロジック / 未検証 response の内層流入
- **関連**: 0070 / 0021 / 0072 / 0040 / 0030

### 0072 型生成(API スキーマ)— Accepted(B4)

- **決定**: バックエンド `openapi.gen.yaml` から **型 + runtime validation(zod)を生成**、生成器は **orval**(zod スキーマ + `z.infer` 型)。response は `adapters` 境界で zod 検証
- **決定**: 生成物は `src/adapters/gen/` に配置、手編集禁止(do-not-edit)。生成型・zod スキーマの内層漏洩禁止で変換は `adapters` 境界
- **決定**: 取込パイプライン = セットアップ時に座標を静的マニフェスト保存 → `gh` で `openapi.gen.yaml` 取得(`info.version` 末尾にバックエンドコミット short SHA スタンプ)→ orval 生成。CI に生成物 drift ゲート(再生成→`git diff` で fail)
- **禁止 / exclusion**: API 型の手書き複製 / `gen/` 手編集 / 生成型の内層漏洩 / 取得座標のマニフェスト外ハードコード / drift ゲートなしのコミット運用
- **関連**: 0070 / 0071 / 0020 / 0021 / B9

### 0080 エラーハンドリング — Accepted(B6)

- **決定**: `errors` カーネルに transport 非依存の sentinel 分類を定義(go apperror 翻案、HTTP status やレスポンス形式を持たない)。一次キーは HTTP status。安定エラーコード列は暫定で、実装時にバックエンドの `ErrorResponse.code` enum に整合(独自語彙を発明しない)
- **決定**: 生 HTTP status → sentinel + コード + メッセージ変換は `adapters` 境界で 1 回だけ。未知エラーは `Internal`(500)へ矯正
- **決定**: App Router 特殊ファイル(`error.tsx` / `global-error.tsx` / `not-found.tsx`)は正規化済みを表示するだけの薄い境界。swallow 禁止 / `Error` の `cause` で chain 保持 / redact。ログは境界で 1 回、5xx=error・4xx=warn
- **禁止 / exclusion**: `errors` への HTTP status 保持 / 生 status・スタックの内層/UI 漏洩 / swallow / 秘匿情報の非 redact / 特殊ファイルへの業務ロジック / 重複ログ。go の worker 分類(`ErrRetryable` 等)は不採用
- **関連**: 0021 / 0071 / 0040 / 0081 / 0070

### 0081 観測性・ロギング — Accepted(B7)

- **決定**: `logging` カーネルは抽象ロガー interface 経由(実装隠蔽)。ctx-native で `trace_id` / `span_id` 自動注入、出力先・format は注入で決定、ログキースキーマを 1 箇所集約
- **決定**: `observability` カーネルは **vendor-neutral OTLP-only**(vendor SDK を import せず vendor 差は Collector へ)。resource attribute は公式 semconv のみ。W3C TraceContext + Baggage 伝播
- **決定**: シグナル別 config gating(`OBS_*` config、exporter 値が non-empty かつ `none` でなければ enabled、構築時に効かせる)。`logging` は `observability` を import しない(注入で受ける)
- **決定**: ブラウザ側テレメトリは **BFF 中継が seam**(`/api/*` 経由でサーバから OTLP export、ブラウザから直接 SaaS へ送らない)
- **禁止 / exclusion**: vendor SDK の import / custom semconv キー / `logging`→`observability` import / カーネルの config 直読 / ブラウザ直送 / PII・token のログ出力。RUM・観測性 SaaS SDK の本体同梱は fork 先判断(exclusion)
- **関連**: 0021 / 0030 / 0080 / 0071 / 0002

### 0153 CI 構成 — Accepted(B9)

- **決定**: 1 関心事 = 1 ワークフロー。job = lint(`pnpm lint:ci`)/ typecheck(tsc)/ build(`next build`、ビルド時 env 全量検証含む)/ test(vitest)/ e2e(playwright)+ 起動スモーク(`next start`→`curl /`)+ 生成物 drift ゲート + カバレッジゲート(90%)
- **決定**: CI ハードニング = actions の**検疫付き SHA ピン**(未ピンは fail-closed)/ concurrency(`cancel-in-progress: true`)/ 最小 permissions(`contents: read` 既定 + 局所加算)
- **決定**: hooks mirror CI(local = 高速フィードバック / CI = 権威・full・キャッシュ無効)。解析は結果 capture → PR コメント upsert → 最後に fail-closed。trigger は CI Checks / Security / Deployment / Documentation にグループ化
- **禁止 / exclusion**: moving tag での actions 使用 / 広い permissions / concurrency 制御なし / hook の恒久 bypass / go 固有ジョブ(image-scan / migration 等)の持込。matrix 非採用(`ubuntu-latest` 単一、Node は `mise.toml` SSOT)
- **関連**: 0151 / 0090 / 0002 / 0072 / 0110 / 0141 / 0150 / 0011 / 0030

### 0110 セキュリティ運用 — Accepted (一部 exclusion)(B10)

- **決定**: 依存更新は **Dependabot + cooldown**(patch 5 日 / minor 7 日 / major 30 日、security は即時)。Renovate 不採用。エコシステムは `npm` + `github-actions`
- **決定**: 秘密スキャン = gitleaks(生成物を allowlist 除外、fail-closed)。脆弱性 = CodeQL SAST(`javascript-typescript`)/ Trivy fs 二段(dev PR は `ignore-unfixed:true` advisory、release は `ignore-unfixed:false` 厳格)/ 依存監査は「到達可能 or 修正可能のみ blocking」。`SECURITY.md` 設置
- **禁止 / exclusion**: Renovate 併用 / security への cooldown / gitleaks・CodeQL の非 fail-closed / 依存監査の全 severity 一律 hard-fail。**no-Docker 由来 exclusion** = コンテナ image スキャン / cosign 署名・SLSA provenance・SBOM / Dependabot `docker` エコシステム
- **関連**: 0153 / 0004 / 0151 / 0011 / 0072 / 0150

### 0090 テスト戦略 — Accepted(B8)

- **決定**: フレームワーク = **Vitest + React Testing Library + MSW + Playwright**。層別責務 = unit(Vitest)/ component(Vitest+RTL)/ integration = HTTP 境界のみ(Vitest+MSW、内側 mock・型/形状アサート)/ e2e(Playwright)
- **決定**: 戦略(go 翻案)= テストは実装隣に co-location / ケースは `正常系` `異常系` の日本語命名 / table-driven 禁止(sequential sibling)/ 1 対象 1 テスト。ファイル名は kebab-case + `.test.ts(x)`
- **決定**: カバレッジ 90% ハードゲート(例外は所有 README に記録+承認)。二層実行(CI 厳格・キャッシュ無効 / ローカル高速・キャッシュ有効)。mock は MSW(HTTP 境界)+ `vi.mock`(モジュール境界)、config は `vi.stubEnv` + factory 再生成
- **禁止 / exclusion**: `__tests__/` 集約 / table-driven / integration の内側実結合 / カバレッジ除外の無承認増加 / exact pin・`pnpm audit` なしの依存追加
- **関連**: 0027 / 0028 / 0040 / 0030 / 0004 / 0151

## Tier 5: 機能・互換(C 系)

### 0121 i18n 戦略 — Accepted (exclusion)(C1)

- **決定 / exclusion**: i18n ライブラリ(next-intl 等)・ロケール解決・翻訳キー体系を本体同梱しない(fork 先判断)。採用時の seam は `proxy.ts`(ロケール検出・リダイレクト)+ route セグメント `[locale]`
- **関連**: 0011 / 0043 / 0040

### 0100 アクセシビリティ目標 — Accepted(C2)

- **決定**: 目標水準は **WCAG 2.x AA**(fork 先の AAA 引上げは妨げない)。静的検査は biome の a11y ルール群を `lint:ci` で強制。手動チェック(キーボード / フォーカス / コントラスト / スクリーンリーダー)は UI feature 実装 PR 時
- **禁止 / exclusion**: biome a11y ルールの理由なき無効化 / a11y を feature 実装から切り離す「後追い」
- **関連**: 0002 / 0021 / 0090 / 0050

### 0101 パフォーマンス予算 — Accepted(C3)

- **決定**: 一次指標は Core Web Vitals(LCP / INP / CLS)。Lighthouse / bundle size を CI で計測する仕組みを持つ(組込みは B9)。**具体閾値・ハードゲート化は用途依存で fork 先 / 実装 PR** に委譲
- **禁止 / exclusion**: 用途を問わない固定 SLO の本体強制 / 計測の仕組み自体を持たないこと
- **関連**: 0153 / 0040 / 0030 / 0050

### 0102 ブラウザサポート行列 — Accepted(C4)

- **決定**: Next.js 既定 browserslist を追認(モダンブラウザ前提)。polyfill は Next.js 既定に委ねる。切り捨て条件は用途依存で fork 先
- **禁止 / exclusion**: 独自 polyfill / 広い後方互換ターゲットを先回りで足すこと
- **関連**: 0040 / 0011 / 0101

### 0045 フォント・画像 — Accepted(C5)

- **決定**: フォントは `next/font`(セルフホスト・CLS 抑制)、ルート `layout.tsx` を基点。ラスター画像は `next/image`(static import 推奨)。`public/` は静的公開アセットのみ。動的 OG 画像は `ImageResponse`(`opengraph-image` 特殊ファイル)
- **禁止 / exclusion**: Web フォントの外部 CDN 直参照・手動 `@font-face` / ラスター画像への生 `<img>`(装飾 SVG 除く)/ `public/` へのビルド要ファイル・秘匿ファイル配置
- **関連**: 0040 / 0027 / 0028 / 0011 / 0044

### 0043 Middleware(Proxy)方針 — Accepted(C6)

- **決定**: Next.js 16 で Middleware→**Proxy(`proxy.ts`)** にリネーム。`src/proxy.ts` は薄い境界・last resort(rewrite / redirect / ヘッダ・cookie 操作 / optimistic 権限リダイレクトのみ)、業務ロジック・データ取得禁止
- **決定**: 既定 Node.js runtime で `runtime` セグメント設定は使用不可(エラー)。CDN(Edge 相当)配置され得るため Edge 互換(Node API・共有グローバル非依存)を保つ。認証は fork 先判断で、`proxy.ts` は optimistic のみ・確定的認可はデータ境界(`adapters` / Route Handler / Server Action)
- **禁止 / exclusion**: `proxy.ts` への業務ロジック・データ取得 / セッション管理・確定認可の主機構化 / deprecated `middleware.ts` の新規作成 / 共有モジュール・Node API 依存 / `runtime` セグメント設定記述 / 特定認証・runtime 前提の本体強制
- **関連**: 0070 / 0040 / 0030 / 0021

### 0044 SEO / メタデータ戦略 — Accepted(C7)

- **決定**: head メタデータは App Router **Metadata API** 既定(`<head>` 手書き・`next/head` 禁止)。ルートに `metadataBase` と `title.template` の既定土台、各セグメントは差分宣言
- **決定**: クローラ制御は `app/sitemap.(xml|ts)` / `app/robots.(txt|ts)`(大規模は `generateSitemaps`)。canonical / 言語 alternates は `alternates.canonical` / `alternates.languages`。JSON-LD 採用可(枠のみ)。アイコン体系 = 生成/複数解像度は `app/icon.*` / `apple-icon.*`、静的 favicon は `public/`(0045 と責務分担)
- **決定**: `proxy.ts` 併用時は matcher でメタデータファイルを除外
- **禁止 / exclusion**: `<head>` 手書き・`next/head` / メタデータ重複定義 / `sitemap`・`robots` の独自静的配置 / 手書き `<link rel="canonical">` / matcher でのメタデータファイル巻込 / 用途依存の具体値の本体固定
- **関連**: 0045 / 0040 / 0028 / 0043 / 0121

### 0130 PWA 戦略 — Accepted (exclusion)(C8)

- **決定 / exclusion**: Web App Manifest / Service Worker / オフラインキャッシュ / インストール促進(A2HS)を本体同梱しない(fork 先判断)。採用時の seam は `app/manifest.(json|ts)` ファイル規約(アイコンは 0044 の体系と接続)、Service Worker は fork 先実装
- **関連**: 0011 / 0121 / 0044

### 0131 Cookie 同意 / 同意管理 — Accepted (exclusion)(C9)

- **決定 / exclusion**: Cookie 同意バナー・同意状態管理・consent gating・同意連動トラッキング制御を本体同梱しない(法令要件は用途依存 = fork 先)。採用時の seam は cookie(`proxy.ts` / client state)保持 + トラッキング実行可否を同意状態にゲート。運用テレメトリ(0081)とユーザ行動トラッキングは区別
- **関連**: 0011 / 0121 / 0130 / 0081 / 0043

## Tier 6: ドキュメント・メタ(D 系)

### 0140 ドキュメント運用ポリシー — Accepted(D1)

- **決定**: canonical 言語モデルの最終目標は go ADR 0008 モデル(英語 canonical + `docs/ja/**/*.ja.md` 日本語 mirror + 生成 portal)だが、**移行は v1 大規模整理まで保留**、0.0.x は日本語を canonical のまま living 運用
- **決定**: ADR タクソノミー 4 分類 = decision / exclusion(`docs/adr/`)/ rule(**`docs/rules.md` 新設**)/ inventory(`BACKLOG.md`)。AGENTS.md の rule を段階的に `rules.md` へ移し、各ルールに `> Rationale: [ADR-NNNN]` 逆参照
- **決定**: ADR 不可変性 = 0.0.x は living(直接上書き・改定履歴を積まない)、v1 凍結時から immutable / supersede-by-new-ADR / NNNN 連番・番号再利用なし。per-package README を正とする
- **禁止 / exclusion**: タクソノミーの取り違え / 0.0.x ADR への改定履歴表 / v1 前の immutable 強制 / `*.ja.md` を AI の canonical 読込元に / AGENTS.md への無制限 rule 積み増し
- **関連**: 0152 / 0155 / 0021 / 0141 / 0052 / 0060

### 0141 ポータル運用 — Accepted(D2)

- **決定**: `docs/portal/manifest.yaml` を portal 構造の単一ソース(`meta:` ブロック + `{src, dst}` section エントリ)。原則「manifest = キュレーション済み手引きであって辞書ではない」で構造制御のみ、内容は canonical README が正
- **決定**: 登録基準 = コード package/層 README は手動登録、`docs/<dir>/*.md` は FS スキャンで自動発見、未登録 README は curation 判断待ちの候補(自動追加しない)。生成は Node / esbuild、配信は GitHub Pages(SPA deep-link に 404 fallback)
- **決定**: 運用スキルループ = readme-review → portal-manifest-sync / sync-readme。実装は移植計画 Phase 3(B9 後)
- **禁止 / exclusion**: manifest への内容保持 / 未登録 README の自動登録 / 生成物(`docs.json` / `dist/**`)手編集 / portal の網羅辞書化
- **関連**: 0140 / 0021 / 0155 / B9

### 0142 ライセンス選定(MIT)— Accepted(D3)

- **決定**: ライセンスは **MIT**(最大許容性 / エコシステム標準 / 姉妹 go-boilerplate と統一 / 低儀式性)。OSS 寄与は **inbound = outbound(CLA・著作権譲渡なし)**、DCO は必要時 `CONTRIBUTING.md`
- **決定**: 同梱ライブラリのライセンス整合は 0004 許可リスト(MIT / Apache-2.0 / BSD-3-Clause / ISC / 0BSD)が担保。`package.json` の `private: true`(npm publish ガード)と MIT は別レイヤで両立。fork 先 application のライセンスは fork 先判断
- **禁止 / exclusion**: コピーレフト(GPL / AGPL / SSPL 等)・ライセンス不明依存の追加 / CLA・著作権譲渡の必須化 / `private: true` を MIT 無効化と解釈 / `LICENSE` の Copyright・許諾文の無断改変。follow-up: `package.json` への `"license": "MIT"` 追加はルート設定保護のためユーザ指示待ち
- **関連**: 0004 / 0011 / 0140
