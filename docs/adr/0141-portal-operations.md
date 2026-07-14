# ポータル運用

ドキュメントポータル(`docs/portal/`)の **manifest 構造 / 登録基準 / portal ↔ docs の責務分担 / 生成・配信の仕組み / 運用スキル / 実装タイミング** を定める。[0140](0140-documentation-operations.md)(D1)の三層戦略の第 3 層(生成 portal)を具体化する。go-boilerplate の portal 運用(go `docs/maintenance/portal-manifest.md` / go ADR 0090「docs via GitHub Pages」)を翻案する。

## Status

Accepted

（採番はブロック帯で確定(2026-07-14・0001〜0155。トピック順ブロック帯(10 番台=主題ブロック))([決定 5](../plan/pre-implementation-decisions.md))。本 ADR の内容自体はユーザ決定済み([決定 5](../plan/pre-implementation-decisions.md))。日付 2026-07-13。0.0.x の ADR は living document として本文を直接上書きし、改定履歴を積まない）

## 背景

BACKLOG D2 は、`docs/portal/manifest.yaml` への登録基準・portal ↔ docs ディレクトリの責務分担を未決としていた(実装をブロックしない項目のため、AGENTS.md に D2 の `[TODO]` セクションは置かれていない — [0152](0152-agents-md-policy.md) の掲載基準)。本リポジトリは portal 未導入であり、go-boilerplate の portal 一式(manifest スキーマ / gen スクリプト / GitHub Pages 配信 / 運用スキル)は Go 結合がほぼなく(Node / esbuild ベース)言語非依存で翻案できる。本 ADR は登録基準・責務分担の**方針**を確定する(実装は後続。下記「実装タイミング」)。

## 決定

### 1. manifest = 構造の単一ソース(curated manual)

- **`docs/portal/manifest.yaml`** を portal 構造の単一ソースとする(go 翻案)。2 部構成:
  - **`meta:` ブロック(可視構造)**: `groups`(サイドバー最上位ページ順・各 `sections`)/ `subgroups`(section を役割別に再分割)/ `section_titles`(表示名上書き)/ `reference_links`(生成 HTML への常設クイックリンク。例: openapi / coverage)
  - **section エントリ(`meta` 以外)**: `{src, dst}` コピーペア。`src` = リポ内 canonical README、`dst` = `docs/portal/guides/<flat-name>.md`
- **原則「manifest = キュレーション済み手引き であって 辞書ではない」**(go の "curated manual, not a dictionary" の翻案)。portal は人間が読むキュレーション済みの叙述マニュアルであり、全 README の網羅辞書ではない

### 2. 登録基準(手動登録 vs 自動発見)

- **コード package / 層の README(`src/**/README.md` 等)は manifest に手動登録**して `guides/` へコピーする(curation は人間判断)
- **`docs/<dir>/*.md` 直下のドキュメントは FS スキャンで自動発見**する(配置・タイトルは `meta:` 由来、ファイル列挙のみ生成スクリプト側)
- **未登録の on-disk README は drift ではなく「curation 判断待ちの候補」**として扱う(自動追加しない)

### 3. portal ↔ docs の責務分担

- **manifest = 構造制御のみ**(何をどのグループ / section に、どの順で置くか)。**カードの中身は README が正**([0140](0140-documentation-operations.md) canonical / [0021](0021-frontend-responsibility.md) per-package README)
- portal は **canonical ドキュメントの生成ビュー**であり、内容の SSOT を持たない(内容は canonical README / `docs/**` 側)

### 4. 生成・配信

- **生成スクリプト(Node / esbuild)**: manifest の `src`→`dst` コピー / manifest + FS スキャンから `docs.json`(生成物・手編集禁止)出力 / SPA フロントを esbuild でバンドルして `dist/` 出力(go の `gen-portal-docs` / `gen-docs-json` / `build-portal` の翻案。Makefile / pnpm ターゲット名は本リポ体系に合わせる)
- **配信 = GitHub Pages**(go ADR 0090 の翻案)。本番 / デフォルトブランチへの push かつ `docs/**` 変更で発火。**SPA の deep-link には 404 fallback が必要**
- **生成物 drift の自動同期**: 生成物が古いと CI で検出し、生成物更新 PR で追従(go `auto-generate-docs` の翻案)。CI workflow は B9 と接続

### 5. 運用スキルループ

- **readme-review**(内容の manual-worthy 判定 = 基準の単一ソース)→ **portal-manifest-sync**(manifest への登録キュレーション。編集は `manifest.yaml` のみ・自動追加しない)/ **sync-readme**(構造ドリフト整合)。スキル体系は [0155](0155-claude-skills-development.md)(開発系。配置・命名・frontmatter は [0154](0154-claude-skills-operations.md) と共通)。`portal-manifest-sync` は未移植 — portal 導入時に 0155 カバー範囲へ追加(リスト追加は軽微編集)
- 判定基準は現行 manifest から runtime 参照する(基準を複製しない)。本リポの portal 立ち上げ後に基準語彙を再導出する

### 6. 実装タイミング

- portal の実装・GitHub Pages 配信は **移植計画 Phase 3**(Phase 2 = B9 の CI / workflows 導入後)で行う。本 ADR は登録基準・責務分担の方針を定め、実装は後続とする
- `portal-manifest-sync` スキルは portal 導入時に有効化する(現状は対象不在のため移植保留 = BACKLOG 移植バックログの D2 トリガー)

## 禁止事項

- ❌ manifest に内容(カードの本文)を持たせること(内容は canonical README が正。manifest は構造制御のみ)
- ❌ 未登録 README を drift 扱いして自動登録すること(curation は人間判断)
- ❌ 生成物(`docs.json` / `dist/**`)を手編集すること
- ❌ portal を全 README の網羅辞書にすること(キュレーション済み手引き)

## 補足

- 本 ADR の Accepted に伴う BACKLOG の整合(D2 行 / Tier 6 注記 / 移植バックログ)は反映済み。AGENTS.md への整合(Accepted Rules 表への 0140 / 0141 追加)は未実施 — Protected Documentation のため、変更案の提示とユーザ承認を経て適用する
- go の `docs/maintenance/portal-manifest.md` は「CDN 経由・ビルド不要」と記すが実体は esbuild ビルドであり、翻案時は **esbuild 版を正**とする(go 側ドキュメントのドリフトに引きずられない)

## 関連 ADR

- [0140-documentation-operations.md](0140-documentation-operations.md)(D1)— canonical / 三層戦略・per-package README(本 ADR の親決定。portal は第 3 層)
- [0021-frontend-responsibility.md](0021-frontend-responsibility.md) — 層別 README(portal カードの供給元)
- [0155-claude-skills-development.md](0155-claude-skills-development.md) — readme-review / sync-readme の公認(開発系。配置・命名・frontmatter は [0154-claude-skills-operations.md](0154-claude-skills-operations.md) と共通)。`portal-manifest-sync` は portal 導入時に同体系へ追加
- BACKLOG B9(CI 構成)— GitHub Pages 配信・生成物 drift 同期の workflow
