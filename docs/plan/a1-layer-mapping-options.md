# A1/A3 層写像の選択肢比較(決定 1 のたたき台)

> **決定(2026-07-12・最終 = B 改 2)**: **機能スライス × 表示層カーネル(go 式に横断関心事を第一階層へ分離)を採用** — `src/{app, features/<name>, model, components, adapters, config, errors, logging, observability}`。
>
> - **カーネル増設(B 改 2)**: go は横断関心事を `internal/` 直下の独立パッケージとする(`config` / `logging` / `observability` / `apperror` — `pkg/README.md` に明文)。これに倣い `adapters` から `config` を独立させ、`errors`(= apperror 直訳)/ `logging` / `observability` の枠を予約。`adapters` は**外部接続のみ**(backend API client / storage / analytics)に縮小。分離を第一階層に持ち上げ、**各ディレクトリ内はフラットなファイル共置を基本**とする(feature 内も go の集約ディレクトリ同様サブディレクトリなしが基本、肥大時のみ分割)— ネスト深化の防止
> - **物理ディレクトリは対応する決定が下りた時に作る**: `config` = A7 実装時 / `errors` = B6 / `logging`・`observability` = B7。A1 ADR にはカーネル全体図として予約のみ記載し、空ディレクトリは生やさない
>
> - パターン B の骨格を維持しつつ、**go の層語彙 `domain` / `usecase` は不採用**。ADR 0011(表示層ロール定義: ビジネスロジックはバックエンド)との突き合わせで、`src/domain/` が fork 先で業務ロジックの誘導路になるリスクを検出したため、安定核は表示層の語彙 **`model`**(表示用 VO・フォーマッタ)とし、画面ユースケースは feature 内共置とする(本文末尾「追補: ADR 0011 との差異検討」参照)
> - **命名規律(新設・A3 ADR に明文化)**: カーネル・ディレクトリは**役割名のみ許可**。名前だけから受入基準を推定できない名称(`common` / `shared` / `utils` / `util` / `helpers` / `lib` / `misc` 等)は**禁止**。役割を名指しできない置き場が必要になった時点で、それは設計の欠落であり、ADR 追補で役割を定義してから作る。この適用として境界アダプタ層は `lib` ではなく **`adapters`** と命名。あわせて go `pkg/README.md` の Policy(複数参照 or 外部ライブラリ wrap のみ受入 / 単一機能ヘルパは feature 内 / 単一責務)を**カーネル受入基準**として翻案し、二段防衛(名前が役割を宣言・受入基準が中身を検査)とする。汎用ユーティリティの家は作らない(表示系は `model`、非表示系は feature 内。真に横断が必要になったら ADR 追補で明示的に決める)
> - 整合: 本リポ既存 ADR(0002 改定 / 0011 / 0004・0151)・A7 翻案方針・AGENTS.md 暫定挙動に適合。go の **ADR レベル原則**(内向き依存 / 境界強制 / driving adapter 非分割軸 / ツール強制)にも全適合。go の **de facto レイアウト**(層ファースト + 層内集約スライス)とは意図的に異なる(軸反転)— A1 ADR に go 層マッピング表と相違理由を注記
> - ADR 化時に明示する翻案 3 点: ①boundary IF の TS 翻案(`lib` 公開面の構造的型 = 事実上の IF、テストは factory 注入)②Server Action / route handler はビジネスロジック禁止(編成のみ、ADR 0011 の thin proxy 決定と接続)③AGENTS.md `[TODO]` 4 節の削除・書き換えを Accepted と同時実施
> - 次工程 = A1/A3 ADR ドラフト作成(ADR ファイル新規作成はユーザ指示のもと)

[pre-implementation-decisions.md](pre-implementation-decisions.md) の「決定 1: 層の写像」を確定するための比較資料。go-boilerplate の onion(`controller → usecase → domain`、infrastructure が domain の interface を実装)を Next.js 表示層へ写像する 3 案を示す。

- 作成日: 2026-07-12
- 本書は提案であり、`src/` へのディレクトリ追加は行っていない(AGENTS.md の暫定挙動を遵守)。パターン確定 → A1/A3 ADR 化 → 実装の順

## 前提: 全パターン共通で持ち込む不変原則(go 準拠)

1. **依存は内向きのみ**(外側の層ほど揮発的。内側は外側を知らない)
2. **境界 interface**: 内側は抽象(自前の引数型・IF)に依存し、実装は外側が与える
3. **型漏洩禁止**: 生成型(OpenAPI 由来)・外部ライブラリ型を内層に漏らさない。変換は所有境界で行う
4. **層 README = 正**: 各層に README ペアを置き、監査(C-1)・テスト観点(C-5)の実行時読込元とする
5. **route = driving adapter**: App Router のルートセグメントは呼び口であり、コード分割の軸にしない(go ADR 0005 の翻案)
6. **機械強制**: 層依存は ESLint boundaries(ADR 0002「ESLint による補完」)で CI 強制。文書だけで守らない(go ADR 0006 の翻案)
7. **config 単一入口**: `serverConfig` / `clientConfig` を import できるのは境界アダプタ層のみ。内側は値を引数で受け取る(A7 翻案方針)

## 前提: 表示層における onion 語彙の再定義

ビジネスドメインはバックエンド側(BACKLOG out of scope)のため、各層の意味を表示層向けに読み替える:

| go の層 | 表示層での意味 |
| --- | --- |
| domain | **表示ドメイン**: 表示用 ValueObject / フォーマッタ / 単位変換 / 表示バリデーション規則。純粋・依存ゼロ |
| usecase | **画面ユースケース**: データ取得の編成・複数 API の集約・フォーム送信フロー・楽観更新の手順 |
| controller | **route / Server Action**: `page.tsx` / `route.ts` / actions = driving adapter(薄い呼び口) |
| infrastructure | **境界アダプタ**: API client(fetch wrapper)/ config / storage / analytics 等の外界接続 |
| (view) | go に対応物なし。**表示層固有の第 5 要素**として UI コンポーネントの置き場を別途決める必要がある |

---

## パターン A: onion 直訳(層ディレクトリ型)

```text
src/
  app/            # controller 相当(route = driving adapter、薄い)
  domain/         # 表示ドメイン(純粋・依存ゼロ)
  usecase/        # 画面ユースケース(server 関数中心)
  adapter/        # 境界アダプタ(api client / config / obs)= infrastructure 相当
  components/     # view(UI コンポーネント。共有・画面別を内部で区分)
```

依存ルール: `app → usecase → domain` / `app → components → domain` / `adapter → domain` / `usecase → (boundary IF) ← adapter`

- **長所**: go と 1:1 で対応し、C-1(層別監査)/ C-2(ドリフト検出)/ C-4(scaffold)の層マッピング差し替えが最小。境界定義が最も明確
- **短所**: 表示層では domain / usecase が薄くなりがちで**形骸化リスク**。1 機能の修正が 4 ディレクトリに散らばり co-location が弱い。view と usecase の関係(どちらが外側か)は onion に無い軸で、結局独自の追加ルールが要る。Next.js コミュニティ慣行から遠い

## パターン B: 機能スライス × 層カーネル(推奨)

「横断的な層カーネル(domain / lib / components)」+「機能ごとのスライス(features)」のハイブリッド。onion の依存規則は保ちながら、修正の局所性(co-location)を優先する。

```text
src/
  app/            # controller 相当。page.tsx は feature の画面 RSC を呼ぶだけ(薄い)
  features/<name>/ # 画面ユースケース + スライス専用 UI / hooks / actions を共置
                  #   (内部はフラットなファイル共置が基本。Server Action もここ)
  model/          # 表示層カーネル(横断の表示用 VO / フォーマッタ。純粋)
  components/     # 横断 UI(デザインシステム的な純 UI。fetch / config 禁止)
  adapters/       # 外部接続のみ(backend API client / storage / analytics)
  config/         # 型付き Config(go internal/config 直訳。A7 実装時に作成)
  errors/         # エラー分類(go apperror 直訳。B6 確定時に作成)
  logging/        # ログ(go logging 直訳。B7 確定時に作成)
  observability/  # OTel(go observability 直訳。B7 確定時に作成)
```

(注: 当初案の `domain` / `lib` は決定過程で `model` / `adapters` に改名し、横断関心事カーネル 4 つを go 式に増設 — 冒頭の決定記録と「追補」参照)

依存ルール(import する側 → 許可される先):

| 層 | 許可される import 先 |
| --- | --- |
| `app` | `features` |
| `features` | `model` / `components` / `adapters`(公開面のみ)/ `errors` / `logging` |
| `adapters` | `model` / `errors` / `logging` / **`config`(唯一の許可層 — A7 整合)** |
| `components` | `model` / `errors` |
| `model` | **`errors` のみ**(go「domain の internal 依存は apperror のみ」の直訳) |
| `errors` | なし。`logging` / `observability` は config 値を注入で受ける |

`features ↔ features` は禁止(横断が必要になったら model / components / adapters へ昇格)。

起動 / ビルド境界(`instrumentation.ts` / `next.config.ts` = A7 の検証実行点)は 9 カーネルの**外側**の起動 / ビルドエントリであり `app` には含めない。config を import してよく、ESLint boundaries では専用 element として扱う([ADR 0021](../adr/0021-frontend-responsibility.md) の依存マトリクス節に独立記載)。

- **長所**: 1 機能の変更が 1 スライスに閉じる(co-location)+ onion の内向き依存・境界強制は完全に維持。RSC 境界も feature 内で完結(page = server、`"use client"` は feature 内の葉に押し下げ)。層 README は 9 カーネル(app / features / model / components / adapters / config / errors / logging / observability)+ 各 feature に置け、C-1 / C-2 の fan-out 構造にそのまま載る
- **短所**: go と語彙がずれる(usecase が独立ディレクトリでない)ため C-4(scaffold-endpoint 系)の翻案コストがやや増える。「feature 間依存禁止」「昇格ルール」という追加規約が必要

## パターン C: Next.js 慣行ミニマル(ベースライン)

```text
src/
  app/  components/  hooks/  lib/  types/
```

- **長所**: 学習コスト最小。小規模なら摩擦がない
- **短所**: usecase の置き場が曖昧で「hooks が何でも屋」化しやすく、境界検査も粗くしか書けない。**層別 README・C-1〜C-4 の監査/scaffold 体系がほぼ載らず、go-boilerplate 準拠の完成基準に届かない**。本方針では非推奨(比較基準として記載)

---

## 比較表

| 観点 | A: onion 直訳 | B: スライス × カーネル | C: ミニマル |
| --- | --- | --- | --- |
| go 原則の維持(内向き依存・境界 IF・型漏洩禁止) | ◎ | ◎ | △(粗い) |
| ESLint boundaries での機械強制 | ◎(層 = ディレクトリ) | ◎(カーネル単位の element + feature 間禁止) | ○(粗い) |
| 修正の局所性(co-location) | △ | ◎ | ○ |
| C-1/C-2(層別監査・ドリフト)適合 | ◎ | ◎(要素単位で fan-out) | ✕ |
| C-4(scaffold)翻案コスト | 小 | 中 | 大(体系が無い) |
| 形骸化リスク(表示層で層が薄い) | 高 | 低 | — |
| Next.js / React 慣行との親和性 | 低 | 中〜高 | 高 |

## 推奨: パターン B

理由: go-boilerplate から持ち込むべき本質は「ディレクトリ名の一致」ではなく**不変原則 7 項目(内向き依存・境界強制・README 正・…)**であり、B はそれを全て維持したまま、表示層の現実(機能単位の変更が支配的・RSC の server/client 混在)に最適化できる。A の 1:1 対応の利点(C 系スキル翻案の容易さ)は、層マッピング表を 1 枚差し替えれば B でも C-1/C-2 にそのまま載るため、決定打にならない。

## 追補: ADR 0011 との差異検討(2026-07-12)

本リポの [ADR 0011](../adr/0011-no-docker.md) は「ビジネスロジックはバックエンド別リポ」「`/api/*` は thin proxy」を既に決定している。これと go 層語彙の持ち込みを突き合わせた結果:

- **緊張点**: `src/domain/` / `src/usecase/` という受け皿は、本リポに存在しないはずのビジネスロジックの**誘導路**になる(AGENTS.md A1 `[TODO]`「DDD/Onion 由来の domain/ 等を勝手に作らない」はこの混同防止の布石)。go で onion が守る「安定核」は本リポでは表示用 VO・フォーマッタ程度と小さく、同じ層数・層名の再現は過剰装備
- **解消**: 語彙を変えて縮退する案 (i) を採用(名前維持 + 定義防衛の案 (ii) は不採用)。`domain` → **`model`**、`usecase` → **feature 内共置**。go との対応は下記マッピング表で担保し、C 系スキル(C-1/C-2/C-4)は本表を差し替えて載せる

### go 層マッピング表(A1 ADR に転記する)

| go の層 / パッケージ | 本リポの対応 | 備考 |
| --- | --- | --- |
| domain | `src/model/` | 表示用 VO / フォーマッタ / 表示バリデーション。**ビジネスルール禁止**。依存は `errors` のみ |
| usecase | `src/features/<name>/` の編成部(server 関数 / hooks) | 画面ユースケース。boundary IF は `adapters` 公開面の構造的型で代替 |
| controller | `src/app/`(route / page)+ feature 内 `actions.ts` | driving adapter。薄い編成のみ(ADR 0011 thin proxy と接続) |
| infrastructure | `src/adapters/` | 外部接続のみ(backend API client / storage / analytics)。config import の唯一の許可層。命名規律により `lib` は不採用 |
| internal/config | `src/config/` | 型付き Config(A7 翻案方針。実装は A7) |
| internal/apperror | `src/errors/` | エラー分類。全層から参照可(中身は B6) |
| internal/logging | `src/logging/` | 構造化ログ(中身は B7) |
| internal/observability | `src/observability/` | OTel(中身は B7) |
| (view — go に対応なし) | `src/components/`(横断)+ feature 内 UI | fetch / config 禁止 |

## パターン確定後に決める従属項目(A3 ADR の Enforcement 節へ)

1. ESLint boundaries の element 定義(上記依存ルールの機械表現)と violation の severity
2. `features ↔ features` 禁止の例外有無(昇格ルールの文言)
3. ~~表示ドメインの呼称~~ → **決定済: `model`**(ADR 0011 整合。追補参照)
4. Server Action の置き場(推奨: feature 内 `actions.ts` = controller 相当として扱い、編成関数を呼ぶ)
5. ~~config 許可層~~ → **決定済: `adapters` のみ**(A7 翻案方針の「境界アダプタ = 唯一の許可層」と一致)
6. 層別 README の配置単位(9 カーネル + feature 単位。物理未作成のカーネルは作成時)と最小テンプレート。カーネル受入基準(go pkg Policy 翻案)と命名規律(役割名のみ・`common`/`utils`/`lib` 等禁止)を各 README に転記
