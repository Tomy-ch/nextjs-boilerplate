# 型生成(API スキーマ)

バックエンドの `openapi.gen.yaml` から **型 + runtime validation(zod)を生成**する方針、**生成器 / 生成物の配置 / do-not-edit / 型漏洩禁止 / 取り込みパイプライン(gh 取得 + short SHA スタンプ)/ 生成物 drift ゲート** を定める。

## Status

Accepted

（採番はブロック帯で確定(2026-07-14・0001〜0155。トピック順ブロック帯(10 番台=主題ブロック))([0140](0140-documentation-operations.md))。本 ADR の内容自体はユーザ決定済み。日付 2026-07-13。0.0.x の ADR は living document として本文を直接上書きし、改定履歴を積まない）

## 背景

AGENTS.md の `[TODO] Type Generation`(BACKLOG B4)は、API 型を OpenAPI から生成するか手書きか・生成器の選定・生成物の扱いを未決とし、暫定運用として「API 型を複数箇所で複製しない / 生成扱いすべきファイルを手書きしない」を敷いていた。本 ADR がこれを確定させる。

go-boilerplate は OpenAPI-first(**go 側**の ADR 0009)でモジュラー spec を Redocly でバンドルし(同 0040)、`openapi.gen.yaml` を**クロスリポ契約成果物としてコミット**する(同 0012「バンドル済み `openapi.gen.yaml` をクロスリポ契約成果物として保持」。いずれも本リポの同番号 ADR ではない)。同 0012 はさらに消費者側(本リポ)のパスとして「フロントは GitHub API(`gh` CLI 等)でコミット済みファイルを取得し、**orval + zod** 等で自前の生成を行う」と明示している。本 ADR はこの消費者側を成文化する。

設計フェーズの当初方針は「型のみ(openapi-typescript)」だったが、go-boilerplate の境界値所有哲学([0070](0070-backend-role-separation.md) / go `boundary-ownership.md`)が「response には server 側 runtime 検証がなく、フロントの生成 validation(zod)が契約破れの最後の砦」と前提していることを踏まえ、ユーザが **型 + runtime validation(zod)** を選択した(2026-07-13)。

## 決定

### 型 + runtime validation を生成(生成器 = orval)

- API 型は**バックエンドの `openapi.gen.yaml` から生成**する(手書き複製禁止)。生成物は **zod スキーマ + `z.infer` 由来の型**とする
- **生成器 = orval**(zod スキーマ + TS 型を生成)。go-boilerplate ADR 0012 が消費者パスとして名指しする候補であり、第一候補とする。exact pin / `pnpm audit` は [0004](0004-library-management.md) の採用フローに従う(実装 PR で確定)
- response は `adapters` 境界で zod `.parse()` により runtime validation する([0070](0070-backend-role-separation.md) 境界値所有 / [0071](0071-bff-api-integration.md) が受け取り点)

### 生成物の配置 / do-not-edit

- 生成物は **`src/adapters/gen/`** に配置する。生成 wire 型・zod スキーマは `adapters`(外部接続・変換の所有境界。[0021](0021-frontend-responsibility.md))が所有するため、その内側に colocate する(go が生成物を所有層のパッケージ内 `gen/` サブディレクトリに colocate する作法の翻案。ディレクトリ名 `gen/` は生成物置き場の業界慣行名)
- これは **`adapters` カーネル内の生成専用サブディレクトリ**であり、[0027](0027-directory-structure.md) が追補を要求する「11 カーネル構成に対する `src/` 直下の新規カーネル増設」には当たらない(追補不要)
- **手編集禁止(do-not-edit)**。`src/adapters/gen/` は生成入力(`openapi.gen.yaml`)からの再生成で常に上書きされる。人間・AI は編集しない

### 型漏洩禁止(go rules.md DTO / Type Boundary の翻案)

- 生成型・zod スキーマ(生成された wire 型)を**内層(`model` / feature のドメインロジック)に漏らさない**([0020](0020-adopted-architecture.md) 設計原則 3)
- 変換は所有境界 = **`adapters`**(go の `internal/controller/conv` の翻案)で行い、自前の表示用 view 型([0021](0021-frontend-responsibility.md) `model`)へ変換する。「OpenAPI 制約 = wire contract であって domain rule ではない」を維持([0070](0070-backend-role-separation.md))

### 取り込みパイプライン(gh 取得 + short SHA スタンプ)

1. **セットアップ時(一度)**: **バックエンドのリポジトリ名** と **リポジトリルートからの `openapi.gen.yaml` へのパス** と **取得する ref** を、**静的なマニフェスト(設定ファイル)**として本リポに保存する。マニフェストは**複数の契約を宣言できる**。バックエンドが 1 リポジトリでも契約が 1 本とは限らず(例: 本体 API と認証 Provider は別サービスであり別契約)、契約ごとに版が独立して動くためである
2. **取得時(`make` または `pnpm` コマンド)**: マニフェストの座標から **`gh` 経由で契約を取得**し本リポへコピーする。版の根拠には **GitHub Contents API が返す blob SHA** を使い、**full SHA をマニフェストへ、short SHA を取得した spec の `info.version` 末尾へ**スタンプする。blob SHA は契約ファイルの内容そのもののハッシュであり、内容が変われば変わり同じなら同じであるため、取り込み側でハッシュを計算し直さずに「どの契約を取り込んだか」が一意に定まる。**この SHA が指すのは契約の内容であってバックエンドのコミットではない**。どのコミットから取ったかはマニフェストの `ref` が持つ
3. 取得した spec を入力に **orval で zod + 型を `src/adapters/gen/<契約名>/` に生成**する。契約ごとに階層を切り、突合と再生成を契約単位で回せるようにする。生成後に整形 / typecheck / lint を回す(go の `setup-remove-sample-api` が `gen → fix → lint` を連鎖させる作法の翻案)
4. 生成器は HTTP client の出力先を必須とするが、**生成された client は採用しない**。outbound の resilience は `adapters/server` の手書き wrapper が所有する([0071](0071-bff-api-integration.md))ため、生成 client は契約駆動モックと同じ `mocks/` 側へ置き、本番が参照する `src/adapters/gen/` には wire 型と zod スキーマだけを置く
5. **生成物は linter の対象外とし、整形のみを掛ける**。書き手が居ないコードに規約を課すと、契約が変わるたびに生成器の出力作風で CI が止まり、直す手段が生成器へのパッチしか無くなる。生成物の正しさは drift ゲート(下記)が担保する

### 生成物 drift の CI ゲート(go ADR 0076 の翻案)

検出したい失敗は 2 つあり、**再取得はしない**(契約の取得は意図した行為であり、ゲートが勝手に進めない)。

1. **生成物が手編集された / 取り込んだ契約以外から生成された** — 取得済み契約から**再生成 → `git diff` が出たら fail**(go `gen-oapi-artifacts-check` / `gen-*-artifacts-check` の翻案)
2. **契約を取得したのに生成していない** — マニフェストの blob SHA と、生成器が生成物のヘッダへ書き写す版スタンプを突合する。生成を伴わないため hook でも回せる

1 は 2 を包含するが、2 は失敗の所在を名指しできる。両方を持つ。

## 禁止事項

- ❌ API 型を手書きで複製すること(SSOT = バックエンドの `openapi.gen.yaml`)
- ❌ `gen/` 配下の生成物を手編集すること(do-not-edit)
- ❌ 生成型・zod スキーマを `model` 等の内層へ漏らすこと(変換は `adapters` 境界)
- ❌ 取得座標をマニフェスト外にハードコードすること(座標は静的マニフェストで管理)
- ❌ drift ゲートなしに生成物をコミット運用すること

## 補足

- 本 ADR の Accepted に伴い、AGENTS.md の `[TODO] Type Generation` 節の削除・書き換えを実施する(未実施 — AGENTS.md は Protected Documentation のため、変更案の提示とユーザ承認を経て適用する)
- 取り込み + 生成パイプライン導入(setup マニフェスト + `gh` 取得 + short SHA スタンプ + `make gen-api` 相当 + drift ゲート)は本 ADR Accepted 後の実装 PR で行う。セットアップスクリプトは go `scripts/setup/*.mjs` + `lib/` 構造の翻案(移植インベントリ A-9)。GB-4(scaffold-endpoint 系)移植もこの時期
- go ADR 0015(境界値所有)が指摘する「request ⊆ domain ⊆ response」の方向不変条件のうち、フロントが担保するのは response 側の検証(最後の砦)である

## 関連 ADR

- [0070-backend-role-separation.md](0070-backend-role-separation.md)(A2)— 契約 SSOT / 境界値所有 / runtime validation を担う根拠(本 ADR の親決定)
- [0071-bff-api-integration.md](0071-bff-api-integration.md)(B3)— 生成した zod スキーマの使用点(adapters 境界での `.parse()`)
- [0020-adopted-architecture.md](0020-adopted-architecture.md) — 型漏洩禁止(設計原則 3)/ [0021](0021-frontend-responsibility.md) — `adapters` 変換境界・`model` view 型
- [0004-library-management.md](0004-library-management.md) — orval 等生成器の exact pin / audit
- BACKLOG B9(CI 構成)— 生成物 drift ゲートのワークフロー・CI 組込み
- [0155-claude-skills-development.md](0155-claude-skills-development.md) — `new-env` 同様、setup スクリプト系スキルの Next.js 再設計(本パイプラインの setup 部)
