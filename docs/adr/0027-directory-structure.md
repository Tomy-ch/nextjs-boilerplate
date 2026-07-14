# ディレクトリ構造

[0020](0020-adopted-architecture.md)(採用アーキテクチャ)/ [0021](0021-frontend-responsibility.md)(責務分離)で宣言した **機能スライス × 表示層カーネル** の**論理**構成を、`src/` 配下の**物理**配置として確定する。本 ADR は **物理レイアウト / path alias / co-location 方針 / 共有モジュールの粒度 / 物理ディレクトリの作成タイミング** を定める。

## Status

Accepted

（採番はブロック帯で確定(2026-07-14・0001〜0155。トピック順ブロック帯(10 番台=主題ブロック))([決定 5](../plan/pre-implementation-decisions.md))。本 ADR の内容自体はユーザ決定済み。日付 2026-07-12。0.0.x の ADR は living document として本文を直接上書きし、改定履歴を積まない）

## 背景

[0020](0020-adopted-architecture.md) は 11 カーネル構成(`src/{app, features/<name>, model, components, adapters, capabilities, stores, config, errors, logging, observability}`。`capabilities` は [0022](0022-capabilities-kernel.md)、`stores` は [0023](0023-stores-kernel.md) で追加)と設計原則を、[0021](0021-frontend-responsibility.md) は各カーネルの責務・依存マトリクス・命名規律を宣言した。しかし「`src/` 配下に何をどの粒度で物理配置するか」「path alias をどう使うか」「テスト・スタイルをどこに置くか(co-location)」は物理配置の従属決定として未確定だった。

AGENTS.md の `[TODO] Directory Structure` が敷いていた暫定運用(新規ディレクトリ作成前にユーザ確認 / `@/*` alias 使用 / 既存 `src/app/` に載る構造)を、本 ADR が確定させる。

go-boilerplate は物理配置を **per-package co-location**(実装・テスト・README を同一パッケージに共置)+ 浅い層構成 + 昇格基準を満たしたときのみ共有パッケージへ、という方針で運用している(`pkg/README.md` / `docs/rules.md`)。本 ADR はこれを表示層へ翻案する。

## 決定

### 物理レイアウト

`src/` 直下は [0020](0020-adopted-architecture.md) の **11 カーネル**(9 + `capabilities` [0022](0022-capabilities-kernel.md) + `stores` [0023](0023-stores-kernel.md))とする(全体図・依存方向は [0020](0020-adopted-architecture.md) を正とする)。本 ADR は各カーネル**内部**の物理配置を定める。

```text
src/
├── app/                    # route-segment(page/layout/loading/error)/ route-handler(route.ts)/ metadata(robots等)。[0025]
├── features/
│   └── <name>/             # 1 feature = 1 ディレクトリ。内部はフラット共置(下記)
├── model/                  # 表示用 VO / フォーマッタ / 表示結果型(ActionState<T> 等)(フラット共置)
├── components/             # 横断 UI(フラット共置)
├── adapters/               # 外部接続。server/・client/ の 2 element に分割([0024]・RSC 境界)
│   ├── server/             #   server-only(backend client・secret・config 可)
│   └── client/             #   "use client"(同一オリジン BFF fetch / WS / telemetry 送信・secret 不可)
├── capabilities/           # 横断 client hook(runtime 能力。[0022])
├── stores/                 # 横断 client 状態(複数 feature 共有の Zustand ストア。[0023])
├── config/                 # A7 実装時に作成
├── errors/                 # B6 確定時に作成
├── logging/                # B7 確定時に作成
└── observability/          # B7 確定時に作成
```

- **10 個目のカーネル `capabilities`**([0022](0022-capabilities-kernel.md))/ **11 個目のカーネル `stores`**([0023](0023-stores-kernel.md))と **`adapters` の server / client 分割**([0024](0024-adapters-server-client-split.md))を反映済み。`adapters/server`・`adapters/client` の分割は**恣意的なネストではなく、実行文脈(RSC 境界)という原理的な軸**での分割であり、co-location 規約の「むやみにネストしない」の例外ではない(feature 都合の階層化とは別物)

- `src/app/` は既存(`layout.tsx` / `page.tsx` / `globals.css`)を踏襲する。App Router セグメントの物理構造(`page.tsx` / `layout.tsx` / `loading.tsx` / `error.tsx` / `[slug]/` 等)は Next.js App Router の規約に従う(A4 と接続)
- 横断関心事カーネル(`config` / `errors` / `logging` / `observability`)の物理ディレクトリは対応決定が下りた時点で作成する(後述「作成タイミング」)

### path alias

- 層を跨ぐ import は tsconfig の **`@/*` → `./src/*`** alias を用いる(既存 `tsconfig.json` の設定を追認)。go が module path で境界を跨ぐのと同じく、alias を層間 import の標準経路とする
- **相対 import は同一 feature / 同一カーネル内(= 物理的に近いファイル間)に限る**。カーネルや feature の境界を跨ぐ相対 import(`../../model/...` 等)は用いず、`@/model/...` の形にする。これにより ESLint boundaries([0021](0021-frontend-responsibility.md) Enforcement)の element 解決も安定する

### co-location 方針

1 機能の変更が 1 スライスに閉じるよう、関連ファイルは実装の隣に共置する([0020](0020-adopted-architecture.md) が機能スライス採用の根拠とする修正の局所性(co-location)/ フラット共置基本)。

- **feature 内はフラット共置を基本**とする。1 つの `features/<name>/` に、その feature の画面ユースケース・専用 UI・hooks・`actions.ts`(Server Action)を**サブディレクトリなしで並置**する(go の集約ディレクトリと同型。ネスト深化の防止)
- **テストは実装の隣に co-location する**(go `docs/rules.md` の「Co-locate tests with each layer's implementation」を翻案)。`__tests__/` への一括集約はしない。**テストファイルの拡張子・命名規約は B8(テスト戦略)で確定**する(本 ADR は配置方針のみ。`正常系` / `異常系` の日本語命名など戦略面は [決定 3](../plan/pre-implementation-decisions.md) で go 準拠を確定済み)
- **スタイルは Tailwind ユーティリティを既定**とし([決定 3](../plan/pre-implementation-decisions.md) B1)、別ファイルの CSS は最小化する。グローバル CSS は `src/app/globals.css` に集約する(既存踏襲)。design token / `cn()` ヘルパの置き場は B1 で確定する
- **MSW 等のモック生成物**(triage #73 / #74・B3 orval 由来)は `src/` 外の **`mocks/`(または テストへ co-location)** に置き、生成型([0072](0072-api-type-generation.md) の do-not-edit)と分離する

### 共有モジュールの粒度

- **per-file を基本**とし(1 ファイル 1 役割・フラット共置)、肥大化した時点で **per-folder へ昇格**する(ネスト深化の防止)。go `pkg/README.md` の「単一責務」+ 浅い層構成の翻案
- feature を跨いで共有が必要になった要素は、フォルダを増やす前に [0021](0021-frontend-responsibility.md) の**昇格ルール**(`model` / `components` / `adapters` へ昇格)に従う。共有の受け皿となる汎用フォルダ(`common` / `utils` 等)は作らない([0021](0021-frontend-responsibility.md) 命名規律)

### 物理ディレクトリの作成タイミング

- **空ディレクトリは生やさない**([0020](0020-adopted-architecture.md))。カーネルは中身を伴う対応決定が下りた時点で作成する
  - `config` = A7 実装時 / `errors` = B6 確定時 / `logging`・`observability` = B7 確定時
- 新規ディレクトリを `src/` 直下に増設する(= 12 個目以降のカーネルを足す)には、[0021](0021-frontend-responsibility.md) の命名規律・カーネル受入基準を満たしたうえで **ADR 追補で役割を定義してから**行う(AGENTS.md 暫定「`src/` 直下の新規ディレクトリはユーザ確認」を、11 カーネルの範囲内は本 ADR で追認・範囲外は ADR 追補要、と確定)。10 個目の `capabilities`([0022](0022-capabilities-kernel.md))・11 個目の `stores`([0023](0023-stores-kernel.md))自体、この規約の発動で追加された

## 禁止事項

- ❌ 対応決定(A7 / B6 / B7)が下りる前に横断関心事カーネルの空ディレクトリを生やすこと
- ❌ テストを `__tests__/` へ一括集約すること(実装の隣に co-location する)
- ❌ feature / カーネルの境界を跨ぐ相対 import(`../../` で層を跨ぐ)。層跨ぎは `@/*` alias を使う
- ❌ feature 内に不要なサブディレクトリ階層を作ること(フラット共置が基本。肥大時のみ分割)
- ❌ 11 カーネルの範囲外の新規ディレクトリを ADR 追補なしに `src/` 直下へ作ること
- ❌ 共有の受け皿となる汎用フォルダ(`common` / `shared` / `utils` / `lib` 等)を作ること([0021](0021-frontend-responsibility.md) 命名規律)

## 補足

- 本 ADR の Accepted に伴い、AGENTS.md の `[TODO] Directory Structure` 節の削除・書き換えを実施する([0021](0021-frontend-responsibility.md) の `[TODO]` 削除と併せて。未実施 — AGENTS.md は Protected Documentation のため、変更案の提示とユーザ承認を経て適用する)
- 各カーネル・各 feature への層別 README 配置は [0021](0021-frontend-responsibility.md)「層別 README 運用」を正とする。物理未作成カーネルの README は作成時(A7 / B6 / B7)に用意する

## 関連 ADR

- [0020-adopted-architecture.md](0020-adopted-architecture.md) — 11 カーネルの論理構成・全体図・依存方向(本 ADR の物理配置の親決定)
- [0023-stores-kernel.md](0023-stores-kernel.md) — 11 個目のカーネル `stores`(横断 client 状態。本 ADR の構造図に反映)
- [0021-frontend-responsibility.md](0021-frontend-responsibility.md) — カーネル責務・依存マトリクス・命名規律・昇格ルール(本 ADR の共有粒度・境界 import の根拠)
- [0011-no-docker.md](0011-no-docker.md) — 表示層ロール定義(PaaS / 静的 CDN 配送。物理配置がデプロイ前提と矛盾しないこと)
- [0028-naming-convention.md](0028-naming-convention.md)(A6)/ [0030-environment-variable-management.md](0030-environment-variable-management.md)(A7)— 本 ADR の物理配置の上に載るファイル・識別子命名と `config` カーネルの中身(同日 Accepted)
- BACKLOG A4(ルーティング・レンダリング)/ B1(スタイリング)/ B8(テスト戦略) — 本 ADR の物理配置の上に、App Router 構造・スタイル配置・テスト配置を具体化する枠
