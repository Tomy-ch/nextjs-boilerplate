# フロント内責務分離方針

[0020](0020-adopted-architecture.md) で採用した **機能スライス × 表示層カーネル** アーキテクチャについて、本 ADR は各カーネルの **責務 / 依存マトリクス / 命名規律 / カーネル受入基準 / Server Action の置き場 / 機械的強制(Enforcement)/ 層別 README 運用** を定める。

[0020](0020-adopted-architecture.md) がパターンを**宣言**するのに対し、本 ADR は日常運用で参照する**規約**を定める(go-boilerplate における「ADR = 決定 / rules.md = 日常ルール」の役割分担に相当)。

## Status

Accepted

（採番はブロック帯で確定(2026-07-14・0001〜0155。トピック順ブロック帯(10 番台=主題ブロック))。本 ADR の内容自体はユーザ決定済み。日付 2026-07-12。0.0.x の ADR は living document として本文を直接上書きし、改定履歴を積まない）

## 背景

[0020](0020-adopted-architecture.md) は `src/{app, features/<name>, model, components, adapters, capabilities, stores, config, errors, logging, observability}` の 11 カーネル構成(`capabilities` は [0022](0022-capabilities-kernel.md)、`stores` は [0023](0023-stores-kernel.md))と設計原則を宣言したが、各カーネルが「何を受け入れ、どこを import してよいか」の詳細は従属決定として本 ADR に委ねられた。本 ADR はその従属決定を成文化する。

AGENTS.md の `[TODO] Frontend Responsibility Separation` が敷いていた暫定運用(層概念・依存方向・境界違反禁止の未決定)を、本 ADR が確定させる。

## 各カーネルの責務

[0020](0020-adopted-architecture.md) の go 層マッピング表を責務定義として展開する。

| カーネル | 系統 | 責務 | 受け入れないもの |
| --- | --- | --- | --- |
| `app` | スライス | driving adapter。**3 element**(`route-segment`=page/layout→features / `route-handler`=`route.ts`→adapters/server / `metadata`=robots等→config。[0025](0025-app-layer-elements.md))。`layout` は横断 UI/Provider を薄く mount 可([0026](0026-layout-shell-mount.md)) | 業務ロジック / 編成 / (route-segment の)直接 fetch |
| `features/<name>` | スライス | 画面ユースケース(データ取得の編成 / 複数 API 集約 / フォーム送信フロー / 楽観更新)+ スライス専用 UI / hooks / Server Action。hook + UI の合成点。内部はフラット共置 | 他 feature への依存(下記昇格ルール) |
| `model` | カーネル | 表示用 ValueObject / フォーマッタ / 単位変換 / 表示バリデーション規則 / **表示結果型(`ActionState<T>` 等)**。純粋・依存最小 | **ビジネスルール**(バックエンド責務)/ fetch / config |
| `components` | カーネル | 横断 UI(デザインシステム的な純 UI コンポーネント)。トースト等の UI 状態は持てる | fetch / config / 業務状態 / `capabilities` ・ `stores` の import |
| `adapters` | カーネル | 外部接続のみ(backend API client / BFF fetch / analytics 等)。**server / client の 2 element**([0024](0024-adapters-server-client-split.md)。server = config 可・secret / client = `"use client"`・secret 不可)。生成型・外部型を内層へ漏らさない変換の所有境界 | 業務ロジック / UI / local ブラウザ API(→ `capabilities`) |
| `capabilities` | カーネル | 横断 client hook(runtime 能力 = connectivity / mediaQuery / storage / clipboard / cookie 読み等)。**client-only**。[0022](0022-capabilities-kernel.md) | remote IO(→ adapters)/ `server config` / 業務状態 / UI / ポリシー状態(client config の NEXT_PUBLIC リテラルは可) |
| `stores` | カーネル | 横断 client 状態(複数 feature が共有する Zustand ストア = 選択状態 / ウィザード / グローバル UI トグル等)。**client-only**。[0023](0023-stores-kernel.md) | server state(→ RSC/adapters)/ 単一 feature の状態(→ feature 内 local)/ UI マークアップ(→ components)/ `server config` / secret / 業務ロジック |
| `config` | カーネル | 型付き config(**目的別**・単一オブジェクト非採用。server config〈secret〉/ client config〈NEXT_PUBLIC リテラル〉。[0030](0030-environment-variable-management.md))。`process.env` 直読の唯一の場所。中身は A7 | UI / fetch / 業務ロジック |
| `errors` | カーネル | エラー分類(protocol-agnostic なセンチネル分類)。全層から参照可。中身は B6 | 他カーネルへの依存 |
| `logging` | カーネル | 構造化ログ。config 値は注入で受ける。中身は B7 | — |
| `observability` | カーネル | OTel / トレース。config 値は注入で受ける。中身は B7 | — |

## 依存マトリクス

各カーネルが import してよい先(import する側 → 許可される先)。**本表を正とする**。

| 層(import する側) | 許可される import 先 |
| --- | --- |
| `app/route-segment`(page/layout。[0025](0025-app-layer-elements.md)) | `features`(+ `layout` は横断 UI/Provider を `components`/`capabilities`/ポリシー seam から薄く mount 可。[0026](0026-layout-shell-mount.md)) |
| `app/route-handler`(`route.ts`) | `adapters/server` / `errors` / `logging`(thin proxy・業務ロジック禁止) |
| `app/metadata`(robots等) | `config` / `model`(起動 / ビルド境界例外) |
| `features` | `model` / `components` / `adapters`(公開面のみ)/ **`capabilities`** / **`stores`** / `errors` / `logging` |
| `adapters/server`([0024](0024-adapters-server-client-split.md)) | `model` / `errors` / `logging` / **`config`(= `server config` の唯一の許可層 — A7 整合)**。`server-only` |
| `adapters/client`([0024](0024-adapters-server-client-split.md)) | `model` / `errors` / `logging` / client config(**`server config` 不可**・NEXT_PUBLIC リテラルは可)。`"use client"` |
| `capabilities`([0022](0022-capabilities-kernel.md)) | `model` / `errors` / `logging` / client config(`server config` 不可・NEXT_PUBLIC リテラルは可)。`"use client"` |
| `stores`([0023](0023-stores-kernel.md)) | `model` / `errors` / client config(`server config` 不可・NEXT_PUBLIC リテラルは可)。`"use client"` |
| `components` | `model` / `errors`(`capabilities` / `stores` は import しない) |
| `model` | **`errors` のみ**(go「domain の internal 依存は apperror のみ」の直訳) |
| `errors` | なし。`logging` / `observability` は config 値を注入で受ける |

- 表にない import 方向はすべて**禁止**(内向き依存原則。[0020](0020-adopted-architecture.md) 設計原則 1)
- **`server config`(secret を持つ runtime config object)を import してよいのは `adapters/server` のみ**(実行時の唯一の許可層。A7 翻案方針「境界アダプタ = 唯一の許可層」と一致)。内側の層は server config でなく**値を引数で受け取る**(go「domain は config を知らない」の維持)。※ client config(= NEXT_PUBLIC のビルド時インライン**リテラル**。[0030](0030-environment-variable-management.md))は runtime object でなく公開定数のため、client 側の層(`adapters/client` / `capabilities` / Client Component)も import 可
- **起動 / ビルド境界の例外**: A7 の検証実行点である `instrumentation.ts`(`src/` 直下)と `next.config.ts`(リポジトリルート)は config を import してよい。これらは 11 カーネルの**外側**にある起動 / ビルドのエントリである。`app/metadata`(robots等。[0025](0025-app-layer-elements.md))と `proxy.ts`(Edge 互換 config スライス。[0043](0043-middleware-policy.md))も同格の起動 / ビルド境界例外として config import を許す。ESLint boundaries では専用 element として扱う(具体の element 割当は実装 PR)

### `features ↔ features` 禁止と昇格ルール

feature 間の直接 import は**禁止**する。複数 feature から共有が必要になった要素は、その性質に応じてカーネルへ**昇格**させる:

- 表示用ロジック(VO / フォーマッタ) → `model` へ
- UI コンポーネント → `components` へ
- 外部接続 → `adapters`(server / client の面を実行文脈で選ぶ。[0024](0024-adapters-server-client-split.md)) へ
- **reactive な横断 client hook(runtime 能力) → `capabilities`([0022](0022-capabilities-kernel.md)) へ**
- **横断する client 状態(stateful store) → `stores`([0023](0023-stores-kernel.md)) へ**(非横断〈単一 feature 内〉の状態は昇格せず feature 内 local。既定は [0060](0060-state-management.md))

feature を跨ぐ横断が必要になった時点で「どのカーネルへ昇格するか」を判断し、feature 間の横依存は作らない。

**例外は画面まるごとの story(`src/features/**/*.stories.tsx`)だけ**とする。画面が実際に組み合わせている別 feature の部品を含まない story は、その画面の確認に使えない。story は実行時の依存を持たない確認専用の面であり、そこで合成しても製品コードの依存方向は変わらない。したがってこの 1 種のファイルには app 層と同じ合成の権限を与える(`architecture.ts` の `ENTRY_POINTS` の `feature-story` カテゴリが機械強制する)。**製品コード側の出口は上記 5 つのみで、story を経由して型や実装を渡すことは禁止**する。

## 命名規律

カーネル・ディレクトリは **役割名のみ許可**する。名前だけから受入基準を推定できない名称は**禁止**する。

- **禁止名**: `common` / `shared` / `utils` / `util` / `helpers` / `lib` / `misc` 等(役割を名指ししていない置き場)
- **根拠**: 役割を名指しできない置き場が必要になった時点で、それは**設計の欠落**である。汎用ユーティリティの家は作らない。表示系ヘルパは `model`、非表示系は feature 内に置く。真に横断が必要になったら、**ADR 追補で役割を定義してから**作る
- **適用例**: 境界アダプタ層は `lib` ではなく **`adapters`** と命名する

命名規律(名前が役割を宣言)と後述のカーネル受入基準(受入基準が中身を検査)で**二段防衛**とする。

## カーネル受入基準

go `pkg/README.md` の Policy(下記 1〜3)を翻案し、表示層ロール定義([0011](0011-no-docker.md))由来の 4 を加えた、カーネルへ要素を追加してよい基準とする。

1. **複数箇所から参照される、または外部ライブラリの wrap である**もののみ受け入れる
2. **単一機能ヘルパ**(1 つの feature でしか使わないもの)は feature 内に置く。カーネルへ上げない
3. **単一責務**を保つ(1 カーネル = 1 役割)
4. **ビジネスロジック禁止**(バックエンド責務。[0011](0011-no-docker.md))

命名規律(禁止名)と本受入基準の両方を満たさない要素は、カーネルへ追加してはならない。

## Server Action の置き場

Server Action は **feature 内 `actions.ts`**(controller 相当)に置く。

- driving adapter として扱い、**編成のみ**を行う(feature の編成関数 / server 関数を呼ぶ)。**業務ロジックは書かない**([0011](0011-no-docker.md) の thin proxy 決定と接続)
- `"use client"` は feature 内の葉コンポーネントへ押し下げ、`page.tsx` は Server Component の薄い呼び口に留める(A4 と接続)

## Enforcement(機械的強制)

層の依存方向は文書だけで守らず、ESLint boundaries 相当のプラグインで機械強制する。強制手段の全体方針は [0002](0002-formatter-linter.md)「ESLint による補完」節に接続する(フォーマットと biome が表現できる検査は biome、「import する側の層」を文脈に取る境界検査のみ ESLint で補完)。

- **プラグイン選定(本 ADR で確定)**: 層境界検査には **`eslint-plugin-boundaries`** を採用する([0002](0002-formatter-linter.md) が「具体プラグインの選定と層定義マッピングは A3 の Enforcement 節で定める」としている、その確定をここで行う)。「import する側の層」を element として文脈に取れるのが選定理由で、biome の `noRestrictedImports` では表現できない検査だからである(0002 の能力ベース分担に合致)
- **層定義マッピング(本 ADR で確定)**: 上記「依存マトリクス」がそのまま element(層 = カーネル / feature 単位)+ allowed-import ルールの定義である。11 カーネルを element とし(`app` は route-segment / route-handler / metadata の 3 element、`adapters` は server / client の 2 element に細分。[0025](0025-app-layer-elements.md) / [0024](0024-adapters-server-client-split.md))、`features` は feature 単位の element として `features ↔ features` を禁止する。`server config`(runtime config object)を import してよい element は `adapters/server` と起動 / ビルド境界(`instrumentation.ts` / `next.config.ts` / `app/metadata` / `proxy.ts`〈Edge 互換 config スライス。[0043](0043-middleware-policy.md)〉)のみ(client config の NEXT_PUBLIC リテラルは client 側も可)。server-only(`adapters/server`)と use-client(`adapters/client` / `capabilities` / `stores`)も element 属性で分ける
- **violation severity**: 境界違反は CI(`pnpm lint:ci`)でブロック(error)とする
- **マトリクスの正(本 ADR で確定)**: 依存マトリクスの機械可読な表現は **`architecture.ts` 1 箇所**に置く。ESLint はそれを import して強制へ変換し、層 README の frontmatter は人間向けの同内容を持つため**機械的な突合で守る**(食い違えば `lint:ci` が落ちる)。宣言を 2 箇所へ書き写すと、片方だけ直したコミットが咎められずに通る
- **静的強制 vs 意味的監査の分担**: 静的な層境界強制は ESLint、意味的な層責務の監査は GB-1(arch-check スキル)が担う

## 層別 README 運用

11 カーネル(`app` / `features` / `model` / `components` / `adapters` / `capabilities` / `stores` / `config` / `errors` / `logging` / `observability`)+ 各 feature に README を配置する(go の per-package README ペア方式の翻案)。

- 各 README を **GB-1(層別アーキ監査)/ GB-5(テスト観点)の実行時読込元**(= 正)とする
- 各 README には、本 ADR の**命名規律**(役割名のみ・禁止名)と**カーネル受入基準**(go pkg Policy 翻案)を転記し、その場で参照できるようにする
- 物理未作成のカーネル(`config` / `errors` / `logging` / `observability`)の README は、対応決定(A7 / B6 / B7)の実装時に作成する

## 禁止事項

- ❌ 依存マトリクスにない import 方向(外向き依存 / `model` からの外部 import 等)
- ❌ `features ↔ features` の直接 import(昇格ルールに従いカーネルへ上げる)。**画面まるごとの story のみ例外**(上記昇格ルール)
- ❌ `server config` を `adapters/server`(+ 起動 / ビルド境界)以外の層から import すること(内側は値を引数で受け取る)。※ client config の NEXT_PUBLIC リテラルは client 側の層も import 可
- ❌ 役割を名指ししない置き場(`common` / `shared` / `utils` / `lib` / `misc` 等)の作成
- ❌ Server Action / `actions.ts` に業務ロジックを書くこと(編成のみ)
- ❌ カーネルに単一機能ヘルパ・ビジネスロジックを置くこと(受入基準違反)

## 補足

- **日常ルールの最終集約先に関する注記**: 決定 5 で「rule は最終的に `rules.md` へ集約する」と決定済み(AGENTS.md 肥大化回避。[0152](0152-agents-md-policy.md)「AGENTS.md = 規約集約ファイル」該当節との整合(supersede / 追記)は D1 ADR 化時に行う)。本 ADR が持つ**依存ルール・命名規律**は rule 分類に当たるため、`rules.md` 新設(D1)の際にそちらへ段階移行する
- 本 ADR の Accepted に伴い、AGENTS.md `[TODO]` 各節(Frontend Responsibility / Directory Structure / Naming)の削除・書き換えを実施する([0020](0020-adopted-architecture.md) 側の Overall Architecture Pattern と併せ、計画書「ADR 化時に明示する翻案 3 点」③の 4 節。未実施 — AGENTS.md は Protected Documentation のため、変更案の提示とユーザ承認を経て適用する)

## 関連 ADR

- [0020-adopted-architecture.md](0020-adopted-architecture.md) — 採用アーキテクチャの宣言(本 ADR の親決定)
- [0022-capabilities-kernel.md](0022-capabilities-kernel.md) — `capabilities` カーネル(10 個目・本 ADR のマトリクス / 昇格ルールに反映)
- [0023-stores-kernel.md](0023-stores-kernel.md) — `stores` カーネル(11 個目・横断 client 状態。本 ADR の責務テーブル / 依存マトリクス / 昇格ルール 5 出口目に反映)
- [0024-adapters-server-client-split.md](0024-adapters-server-client-split.md) — `adapters` の server/client 2 element 分割
- [0025-app-layer-elements.md](0025-app-layer-elements.md) — `app` の route-segment/route-handler/metadata 3 element
- [0031-policy-state-supply.md](0031-policy-state-supply.md) — consent/flag の供給方針(source adapter + stateless props)
- [0026-layout-shell-mount.md](0026-layout-shell-mount.md) — `layout` の横断 UI/Provider mount 例外
- [0011-no-docker.md](0011-no-docker.md) — 表示層ロール定義(ビジネスロジック禁止 / thin proxy)。`model` のビジネスルール禁止・Server Action 編成限定の根拠
- [0002-formatter-linter.md](0002-formatter-linter.md) — ESLint による層境界検査の補完(Enforcement の接続先。A3 Accepted が ESLint 実導入のトリガー)
- BACKLOG A5(ディレクトリ構造)/ A6(命名規則)/ A7(環境変数管理・config カーネル) — 本 ADR の物理配置・命名・config 詳細を具体化する後続 ADR 枠
