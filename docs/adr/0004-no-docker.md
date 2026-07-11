# Docker を boilerplate に含めない方針

本プロジェクトでは **アプリケーション配送としての Docker を採用しない** 方針とする。具体的には、Next.js アプリ本体を動かすための `Dockerfile` および本体配送用 `docker-compose.yml` / `.dockerignore` を同梱しない。あわせて本リポジトリの想定ロールを **「Next.js を表示層 (presentation layer) として用いる boilerplate」** と定義し、デプロイ先は PaaS / 静的 CDN を主想定とする。

一方、**dev インフラとしての docker-compose**（モック backend API・OpenAPI viewer・docs viewer・Lighthouse runner など、アプリ起動とは独立した補助ツール群）の利用は本 ADR の禁止対象外とする（後述「Dev インフラとしての docker-compose（例外）」節を参照）。

## Status

Accepted

## 背景

旧構成では Dockerfile（dev / builder / prd の 3 ステージ）と docker-compose.yml を同梱していたが、以下のドリフトが恒常的に発生していた。

- `Dockerfile` の `npm ci` + `package-lock.json` 前提が pnpm 採用方針（ADR 0001）と乖離
- `node:22.15.0-alpine` が `mise.toml` の `node = "24.14.1"`（ADR 0003）と乖離
- `sharp` のために `vips-dev` 等を `apk add` する古い手順が残存（現代の sharp は prebuilt binary を同梱しており不要）

これらの修正コストを払い続けるには、本リポジトリの **想定ロール** と **想定デプロイ先** を絞った方が合理的、という判断に至った。

## 採用理由

### 1. 想定ロールが「表示層」に限定される

本リポジトリは Next.js を「フロントエンド表示層」として用いる boilerplate と定義する。

- UI レンダリング（CSR / SSR / ISR / 静的書き出し）が主責務
- バックエンド API（DB / 認証 / ビジネスロジック）は **別リポジトリ・別サービス**（例: Go / Rails / NestJS / Supabase 等）
- Next.js の `/api/*` ルートは BFF（外部 API への薄いプロキシ・auth トークン交換）に留め、業務ロジックを抱え込まない

この前提では、アプリ本体の Docker 化が解決する「重い system 依存をコンテナに閉じ込める」「DB / Redis 等のバックエンドサービスを同居させる」というニーズがアプリ配送層では構造的に発生しない（dev 補助としての周辺サービスは別問題、後述）。

### 2. 想定デプロイ先がすべて Docker 不要

| デプロイ形態 | プラットフォーム例 | Docker |
| --- | --- | --- |
| 静的書き出し (`output: "export"`) + CDN | S3+CloudFront / GitHub Pages / Cloudflare Pages 等 | 不要 |
| SSR / ISR on PaaS | Vercel / Netlify / Cloudflare Pages / AWS Amplify | 不要 |
| SSR on Node 直接実行 PaaS | Fly.io / Railway / Render | 不要（任意） |

Next.js を self-host する選択肢（ECS / Kubernetes / オンプレ）でのみ Docker が現実的に必要となるが、これは本 boilerplate の想定外。

### 3. `next/image` の sharp は外部 system 依存を持たない

`next/image` コンポーネントは内部で `sharp` を使うが、現代の `sharp`（≥ 0.32）は **prebuilt binary を同梱** しており、`vips-dev` / `libjpeg-turbo-dev` / `libpng-dev` / `libwebp-dev` 等を `apk add` する手順は不要。`pnpm install` だけで完結する。

旧 Dockerfile の重厚な system lib インストール処理は、現代の sharp では vestigial（時代遅れの遺物）となっている。Docker を残す動機の一つだった「`sharp` の system 依存をコンテナに閉じ込める」は、もはや存在しない依存。

### 4. メンテナンス負担の削減

Docker を維持する場合、以下を毎リリースで同期する必要がある。

- `Dockerfile` の `FROM` タグ ↔ `mise.toml` の `node` バージョン
- `Dockerfile` 内の `npm ci` ↔ ADR 0001 の pnpm 方針
- `package-lock.json` 維持 ↔ `pnpm-lock.yaml`（lockfile が二重化）

同梱しないことで、これら同期作業と「同期忘れによるドリフト」が構造的に消える。

## 想定デプロイ先

本 boilerplate を採用したプロジェクトは、原則として以下のいずれかにデプロイする想定。

- **Vercel**（Next.js 公式運営、新機能追従が最速）
- **AWS Amplify Hosting**（AWS エコシステム統合）
- **Netlify**（vendor 中立 PaaS）
- **Cloudflare Pages**（Edge 配信特化）
- **静的 CDN**（`output: "export"` 時。S3+CloudFront / GitHub Pages 等）

これら以外（ECS / Kubernetes / 自社オンプレ等）にデプロイしたい場合は、本 ADR を **役割拡張** として再評価する（後述「再評価のトリガー」参照）。

## 何を削除するか

本 ADR の採用に伴い、以下（**アプリケーション本体の Docker 配送に関連するもの**）を削除する。

- `Dockerfile`（Next.js アプリ本体用）
- `docker-compose.yml`（本体配送用）
- `.dockerignore`
- README からの「Docker による起動」推奨記述（あれば）

`mise.toml` / `package.json` / `pnpm-lock.yaml` 等の構成ファイルは引き続き SSOT として機能する。

## Dev インフラとしての docker-compose（例外）

本 ADR は **アプリケーション本体（Next.js アプリそのもの）の配送に Docker を使わない** という方針であり、開発時に独立して立ち上げる **補助ツール群** を Docker / docker-compose で運用することは禁止対象外とする。

### 対象になりうる用途

| 用途 | ツール例 | 性質 |
| --- | --- | --- |
| モック backend API | `mockoon` / `prism` / `wiremock` | フロント開発を実 backend と独立させる |
| OpenAPI viewer | `redocly/redoc` / Swagger UI | backend の API spec を確認 |
| Docs viewer | `nginx` + Markdown / Mermaid renderer | `docs/` を Mermaid 込みで配信 |
| Lighthouse / e2e ランナー | 自前 headless Chrome / Playwright | 性能・回帰検証 |

これらは「アプリ本体を Docker で動かす」のとは別レイヤであり、`mise.toml` / `pnpm-lock.yaml` との同期問題も発生しない（base image を独自に管理して構わない）。

### 採用する場合のルール

1. **ファイル名で本体配送と区別する** — 例: `docker-compose.dev-tools.yml` / `docker-compose.docs.yml`。`docker-compose.yml`（無印）は本体配送と誤解されやすいため使わない
2. **起動コマンドを明示** — `docker compose -f docker-compose.dev-tools.yml up` 等、専用ファイルを指す形にする。`docker compose up` 単独では起動しない設計
3. **アプリ本体の Node / pnpm はコンテナ外で実行する** — Next.js 自身は `pnpm dev` でホスト実行が前提（mise が PATH を解決する、ADR 0003 と整合）
4. **README / docs に「補助ツールであり配送物ではない」旨を明記** — 利用者が本番デプロイ対象と誤解しないように
5. **`docker-compose.dev-tools.yml` を新規導入する PR は ADR の追補 or 関連 issue を必ず参照** — 例外運用であることを履歴に残す

### 採用しない場合

ここで挙げた用途も、PaaS / SaaS で代替可能なものが多い（モック API は MSW のような Node 内モック、OpenAPI viewer は Stoplight Studio / Postman、docs viewer は GitHub Pages 等）。**Docker でないと解決できないか** を一度問うこと。

## 自己ホスト・コンテナ化したい場合（fork 先向け）

本 boilerplate を fork したプロジェクトが、Docker / self-host が必要なロールに拡張する場合の指針:

1. 本 ADR を fork プロジェクト側で superseded（廃止）扱いとし、別 ADR で「本プロジェクトでは Docker を採用する」と上書き宣言する
2. `Dockerfile` を新規作成する。テンプレートとして git 履歴（本 ADR 適用前の commit）を参照できる
3. 以下を SSOT と整合させる:
   - `FROM node:<X.Y.Z>-alpine` を `mise.toml` の `node` と一致
   - `RUN pnpm install --frozen-lockfile` を採用（`npm ci` は使わない）
   - `package-lock.json` は使わない（`pnpm-lock.yaml` を使う）

## 再評価のトリガー

以下のいずれかが発生した時点で、本 ADR の維持是非を再評価する。

- 本リポジトリのロールが「表示層」から「フルスタック（API も同居）」に拡張された
- Next.js の self-host（ECS / Kubernetes / 自社オンプレ）が本リポジトリの **第一級デプロイ先** として要求された

> 「ローカル開発で DB / Redis / モック API / docs viewer 等を container で立てたい」というのは Type B (dev インフラ) の領域であり、本 ADR の再評価トリガーには含めない（「Dev インフラとしての docker-compose（例外）」節に従い、専用ファイル名で導入する）。

## 禁止事項

- ❌ **アプリケーション本体の `Dockerfile`** や **本体配送目的の `docker-compose.yml`**（無印）を主要構成として復活させること（fork 先での個別判断は対象外）
- ❌ README / ドキュメントで「Docker での起動」を **アプリ本体の推奨デプロイ手段** として記載すること
- ❌ CI / scripts に **アプリ本体の** Docker build を組み込むこと

> Dev インフラとしての docker-compose（`docker-compose.dev-tools.yml` 等の名前付きファイル）は本禁止事項の対象外。

## 補足

- 本 ADR が否定するのは **「アプリ本体の配送手段としての Docker」**（Type A）。**「補助ツール群を docker-compose で立ち上げる」**（Type B、例: モック API / OpenAPI viewer / docs viewer）は対象外であり、専用ファイル名で導入してよい
- 「Docker を全否定する」のではなく、「本 boilerplate のロール定義（表示層）には Type A が不要」という整理。fork 先で必要になったら復活させればよい
- 旧 Dockerfile / docker-compose.yml の内容は git 履歴から参照可能（必要に応じて cherry-pick 可）
- 本 ADR は **ロール定義の文書化** でもある。boilerplate を採用する開発者は、本 ADR を読むことで「このリポジトリで何を作る前提か」を理解できる

## 関連 ADR

- [0001-package-manager.md](0001-package-manager.md) — pnpm 採用（旧 Dockerfile が `npm ci` を使っていた点の根拠）
- [0003-version-manager.md](0003-version-manager.md) — Node / pnpm バージョンの SSOT（Dockerfile FROM タグとの同期問題を消す根拠）
- [Toolchain-0005-library-management.md](Toolchain-0005-library-management.md) — `sharp` の prebuilt binary 等、現代ライブラリの system 依存に関する評価指針
