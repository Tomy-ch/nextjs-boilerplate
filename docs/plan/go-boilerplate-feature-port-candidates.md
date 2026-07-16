# go-boilerplate 機能移植候補インベントリ

隣接リポジトリ `go-boilerplate` の**リポジトリ機能そのもの**(make ターゲット / CI / スクリプト / ドキュメント基盤 / セキュリティ運用)を調査し、本リポジトリをアプリケーションファウンデーション / プロダクションレディへ引き上げるために移植価値のある要素を抽出したもの。

- 調査日: 2026-07-11 / 対象スナップショット: `go-boilerplate` (`makefile` include 37 本 / `.makefiles/` 12 分類 / `.github/workflows/` 26 本 / `scripts/` 11 種)
- **[BACKLOG.md](../adr/BACKLOG.md) の「go-boilerplate Claude 資産 移植バックログ」(`.claude/` スキル・エージェント)とは別軸**。本書はリポジトリ機能が対象。ただし着手トリガーは同じ BACKLOG 枠 ID に紐づける
- 言語差(Go → TS)は書き換え前提のため障害としない。Go 実装のものは「TS 書換」と明記

## 判定の前提: nextjs-boilerplate の現状

| 領域 | 現状 |
| --- | --- |
| `.makefiles/` | `github/`(release-branch / release-tag / setup-repository / branch-ruleset / labels / gh-login)と `tools/setup.mk` のみ移植済 |
| `scripts/` | `make_help.sh` / `semver.ts` / `setup/`(license 書換のみ)移植済 |
| `.github/` | ISSUE_TEMPLATE / PR テンプレ / settings(branch-protection.json, labels.json)/ release/ 移植済。**workflows/ は存在しない**(B9 未決定) |
| Git hooks | 0151(lefthook)は **Accepted だが未実装**(G2 = ✅/⬜)。lefthook 自体が未導入 |
| 品質ゲート | `pnpm lint / fix / format`(biome)のみ。markdown / mermaid / secret / 脆弱性の検査は無い |
| ドキュメント | `docs/adr/` のみ。portal 基盤は無い(D2 未決定) |

## 凡例

- **移植方式**: `as-is` = ほぼ無翻案 / `TS 書換` = 概念流用・実装書き直し / `パターン` = 骨格のみ流用し中身は本リポ向けに再設計
- **ブロッカー**: BACKLOG 枠 ID。`—` = 保留領域に踏み込まず今すぐ移植可能(AGENTS.md の Instruction Priority 内で完結)

---

## Tier A: 今すぐ移植可能(ADR ブロッカーなし)

ローカル実行の make ターゲット + スクリプト群。`.github/workflows/` に触れず、既存 ADR(0001/0002/0003/0004/0151)の範囲内で完結する。

| # | 機能 | go 側の実体 | 移植方式 | 備考 |
| --- | --- | --- | --- | --- |
| A-1 | **lefthook 導入**(pre-commit / commit-msg / pre-push) | `.lefthook.yaml` | パターン | **G2 の実装ギャップ解消そのもの**(ADR は Accepted 済)。glob スコープ + parallel 実行 / pre-push に secret-scan・drift check を置く構成が参考。`pnpm add -D -E lefthook` |
| A-2 | **commitlint**(コミット規約の機械検査) | `commitlint.config.js` + `.makefiles/github/commitlint.mk` | as-is | prefix 11 種(`Feat\|Fix\|...`)は本リポの 0150 と完全同一。config はほぼコピー可。lefthook commit-msg に接続(A-1 依存)。現状は規約が文書のみで無検査 |
| A-3 | **markdownlint**(`md-lint` / `md-fix`) | `.makefiles/markdown/lint.mk`(markdownlint-cli2)+ `.markdownlint.yaml` | as-is | ADR / BACKLOG / スキル等 md 資産が多い本リポで即効性が高い。除外 glob(`#glob` 構文、Make 内では `\#` エスケープ)と `AGENTS.md` 除外の知見ごと移植 |
| A-4 | **mermaid 構文 lint**(`md-mermaid-lint`) | `scripts/mermaid-lint.mjs` | as-is | markdownlint が見ない図の文法を本物の `mermaid.parse` で検証。linkedom で DOM shim / exit 1(lint 失敗)と exit 2(環境異常)の区別が CI 向き。BACKLOG.md の依存マップ等 mermaid を既に使用 |
| A-5 | **secret スキャン**(`secret-scan`) | `.makefiles/security/gitleaks.mk` + `.gitleaks.toml` | as-is | `gitleaks dir . --no-banner --redact`(`--redact` で検出値の二次漏洩を防止)。B10 は CI 組込みの決定待ちだが、**ローカル make ターゲット + pre-push hook までは 0151 の範囲**で導入可 |
| A-6 | **依存脆弱性スキャン**(`trivy-fs`) | `.makefiles/security/trivy.mk` | as-is | `trivy fs --scanners vuln --pkg-types library --ignore-unfixed --severity CRITICAL,HIGH,MEDIUM` は pnpm lockfile も対象。0004 の `pnpm audit` を補完(DB が異なる)。`--skip-dirs` は `node_modules` に読み替え |
| A-7 | **actionlint**(`actions-lint`) | `.makefiles/github/lint.mk` | as-is | workflows が生えた瞬間に必要になる。make ターゲット自体は先行導入しても害がない(B9 決定後の受け皿) |
| A-8 | **make help の未文書化警告** | `scripts/make_help.mjs` | as-is | `.PHONY` 行に `## 説明` が無いものを stderr 警告する自己文書化の強制。既存 `make_help.sh` との差分確認のうえ置換 or 追補 |
| A-9 | **セットアップスクリプトの拡充** | `scripts/setup/`(`replace-repository-reference.mjs` / `replace-app-metadata.mjs` / `remove-sample-api` の宣言的マニフェスト + マーカーコメント方式) | パターン | 本リポは license 書換のみ移植済。README の URL / バッジ書換、`package.json` name 書換(Go module rename の翻案)を追加。共有 lib(commander `--dry-run` / `updateFile` / 再帰列挙)は流用可 |
| A-10 | **mise へのツール登録**(`npm:` バックエンド) | `mise.toml` の `npm:markdownlint-cli2` / `npm:@commitlint/cli` 等の pin 方式 | as-is | A-2〜A-7 のツール版管理を `mise.toml` SSOT(ADR 0003)に載せる際の手本。`tools-upgrade` スキルはこの複数バックエンド形式を既に想定済 |

**推奨着手順**: A-1(lefthook)→ A-2(commitlint)→ A-3/A-4(md lint)→ A-5/A-6(security)→ A-8〜A-10。A-1〜A-4 だけで「コミット規約・ドキュメント品質の機械検査」が閉じる。

> 注: A-1 の `.lefthook.yaml`、A-2〜A-6 のルート設定ファイル追加と `package.json` / `mise.toml` 変更は AGENTS.md の保護対象なので、実施時は都度ユーザ指示が必要。

---

## Tier B: CI 基盤(B9 決定待ち — ADR 策定時の設計材料)

`.github/workflows/` は B9(CI 構成方針)未決定のため追加不可。go 側の 26 本の workflows から、**B9 の ADR を書くときにそのまま設計材料になるもの**を抽出。B9 決定が最優先のアンブロック条件。

### B-1. 全 workflow 共通の衛生規約(そのまま規約化推奨)

- 全 `uses:` を **SHA ピン + `# vX.Y.Z` コメント**で固定(→ B-3)
- `concurrency: ${{ github.workflow }}-${{ github.ref }}` + `cancel-in-progress: true`(deploy 系のみ false)
- トップレベル `permissions: contents: read`、job 単位で最小昇格
- 「`set +e` で実行 → ログを tee → 成否を outputs 化 → **失敗してもログを PR コメントに必ず残す** → 最後に fail」という共通骨格

### B-2. PR コメント基盤: `upsert-pr-comment` composite action

`.github/actions/upsert-pr-comment/`。HTML コメントマーカーで冪等 upsert / `<details>` 折り畳み / 45,000 字トランケート / commit SHA + JST タイムスタンプのフッタ。**全 CI レポーティングの背骨で、完全に言語非依存 → as-is 移植**。

### B-3. Actions SHA ピン留め機構

`scripts/pin-actions/`(Go)+ `.github/actions-pin.toml`(lockfile SSOT)+ `pin-actions-check.yaml`。`--min-age-days=14` の**サプライチェーン検疫**(新しすぎるコミットを採用しない = `tools-upgrade` スキルと同思想)。**TS 書換が必要**。BACKLOG **C-6(actions-pin スキル)と同じ枠**で、スキル(運用)と check(CI ゲート)をセットで移植するのが正。

### B-4. 本リポに直接対応物がある CI チェック(翻案表)

| go 側 | 本リポでの対応物 | 移植方式 |
| --- | --- | --- |
| `go-lint`(golangci-lint) | `pnpm lint`(biome)+ `tsc --noEmit` | パターン(骨格 = B-1/B-2 に載せるだけ) |
| `go-test` + `cover-gate`(閾値 90%)+ octocov | B8 決定後の `pnpm test` + カバレッジゲート | パターン(B8 待ち) |
| `tidy-check`(go.mod drift) | `pnpm install --frozen-lockfile` での lockfile drift 検査 | パターン |
| `app-di-startup-check`(boot smoke) | `pnpm build` → `next start` → `curl /` の起動スモーク | パターン。「具象に依存しない起動検証」の思想ごと |
| `secret-scan` / `trivy-fs` workflows | A-5 / A-6 の CI 側(B10 と同時決定) | as-is に近い |
| `code-ql`(Go) | `languages: javascript-typescript` に差替。**PR + push baseline + 週次 cron `0 0 * * 1`** の三段トリガー設計ごと | as-is に近い |
| `trivy-release-gate` | dev PR = fixable のみ / release PR = unfixed 含む全量、の**二段構え**設計 | as-is に近い |
| `sync-versions-check` | mise.toml SSOT → CI の node 版数の drift 検査(workflows 導入後に意味を持つ) | TS 書換(小規模) |
| gen 系 artifacts-check 三兄弟 | B4(型生成)導入後の「生成物 drift 検査 + **ソース起因か生成器起因かの triage コメント**」 | パターン(B4 待ち) |
| `deploy-docs`(GitHub Pages) | D2(portal)採用時の docs 配信 | as-is |
| `auto-generate-docs`(bot が生成物更新 PR を自動作成) | 再帰防止 guard(`github-actions[bot]` / `[skip ci]` / branch prefix)+ 非決定性出力の除去 + `peter-evans/create-pull-request` | パターン |
| `dependabot.yml` | `npm` + `github-actions` ecosystem。**cooldown 段階制(patch 5 日 / minor 7 日 / major 30 日)+ ecosystem 単位のグループ PR** | as-is(B10) |

**対象外(移植しない)**: `deploy-app`(GHCR build / cosign 署名 / SLSA attestation — ADR 0011 no-docker に非互換。PaaS デプロイは各プラットフォーム連携に委ねる)/ `image-scan` / `docker-lint` / `sql-lint` / `migration-check` / `setup-postgres` composite / `govulncheck`(→ `pnpm audit` が既に相当)。

---

## Tier C: ドキュメント基盤(D1 / D2 決定待ち)

| # | 機能 | go 側の実体 | 移植方式 | ブロッカー |
| --- | --- | --- | --- | --- |
| C-1 | **docs ポータル一式** | `docs/portal/manifest.yaml`(構造の SSOT)+ `scripts/gen-portal-docs.mjs`(curated copy, zod 検証 + path-traversal guard)+ `scripts/gen-docs-json.mjs`(ナビ JSON 生成)+ `scripts/build-portal.mjs`(esbuild SPA, mermaid は遅延 UMD)+ React SPA(hash routing / Fuse.js 検索 / marked / highlight.js) | as-is に近い(**Go 結合ゼロ**。manifest 中身・EN/JA パス規約・除外リストの差替のみ) | **D2**。採用時は BACKLOG「対象外(D)」の `portal-manifest-sync` スキルも復活。`readme-review` スキルは manifest.yaml を既に前提にしている |
| C-2 | **EN canonical / JA 翻訳ペア運用** | `docs/ja/` ミラー + `.ja.md` 規約 + 各 README ペア | パターン | **D1**。`canonicalize-doc` スキル(移植済)が実務を既にカバー — 決めるのは規約側 |
| C-3 | **ADR タクソノミー** | decision / **exclusion**(意図的な不採用を `setup-review` タグ付きで残す)/ rule / inventory の 4 分類 + 採択後不変・supersede 運用 | パターン | 本リポの BACKLOG「out of scope」節が exclusion の萌芽。`adr-scan` スキル(移植済)がこの分類を既に使用。採番規約は本リポの系列プレフィックス方式を維持 |
| C-4 | **SECURITY.md**(報告窓口) | `.github/SECURITY.md` 前半(Private Vulnerability Reporting / 報告要件 / 対応 SLA) | as-is(前半のみ) | **B10**。後半(cosign / attestation 検証 runbook)はコンテナ配送前提で対象外 |
| C-5 | **workflows README 規約** | `.github/workflows/README.md`(トリガー戦略表 + 一覧表 + 設計ノート) | パターン | B9 と同時 |

## Tier D: 環境変数・設定(A7 決定待ち — 参照設計)

A7(環境変数管理)の ADR を書くときの**リファレンス実装**。今は持ち込まない。

- **`env/` レイアウト**: `env/.env.{local,ci,dev,stg,prd}` + README を正とした変数表(`{SUBSYSTEM}_{NAME}` 規約 / 型列 / Secret 要否列 / 「Code default」マーカー)。Next.js 標準の `.env.local` 系との整合が論点
- **型付き Config loader 三点セット**: `envspec`(タグ駆動の入力仕様)→ `model`(private field + getter の不変 Config)→ `config.go`(parse → validate → 明示的マッピング、"parse, don't validate")。TS では **zod schema → `Object.freeze` した型付き config → factory** に素直に写像できる。Next.js 固有の追加軸は **`NEXT_PUBLIC_` の client/server 境界**
- 移植済スキル `new-env` の再設計(0155 記載)はこの決定とセットで行う

## Tier E: テスト基盤(B8 決定待ち — 参照パターン)

- **カバレッジゲート**: `cover-gate`(閾値 90% を下回ると CI fail)+ octocov による PR レポート
- **test / test-cached の二層**: CI = キャッシュ無効 + race 相当の厳格版 / pre-commit = キャッシュ有効の高速版、という速度と厳密性の分離
- BACKLOG C-5(テスト scaffold スキル)と同じトリガーで着手

---

## 移植しない(不適用)一覧

ADR 0011(no-docker / 表示層ロール)と非互換、または Go / DB 固有:

`.makefiles/app/`(serve / job / worker / outbox-relay / tool-runners)、`.makefiles/database/`(migrate / seed / dml-merge / SchemaSpy)、`.makefiles/sql/`(sqlfluff)、`.makefiles/docker/`(hadolint)、`.makefiles/go/`(fmt / golangci / sqlc / tidy / sync-versions 実装)、godoc 生成、`genctxkey`、docker tool-runner ラッパ層全般(本リポは pnpm / mise 直実行)。OpenAPI 系(redocly / `stamp-openapi-version.mjs`)は**不適用ではなく B4 の採否待ち**。

## 総括: 推奨ロードマップ

1. **即時(ブロッカーなし)**: Tier A = lefthook(G2 実装ギャップ解消)→ commitlint → markdownlint + mermaid-lint → gitleaks / trivy のローカルターゲット。これだけで「フック + 品質検査」のファウンデーション層が閉じる
2. **次の ADR 決定を推奨**: **B9(CI)+ B10(セキュリティ運用)をセットで策定** — Tier B の材料はほぼ揃っており、翻案コストが低い(共通骨格 + upsert-pr-comment + lint/lockfile/build スモーク + CodeQL + trivy 二段 + dependabot)。Tier A を先に入れておくと lefthook(速い検査)↔ CI(権威検査)の二重化構造(G2 の設計)がそのまま成立する
3. **中期**: D1/D2(ドキュメント運用 + portal)→ Tier C。A7 → Tier D。B8 → Tier E
4. 各着手時は該当枠の Accepted 化と、AGENTS.md 保護対象(ルート設定 / `.github/` / `.claude/`)への都度ユーザ指示を確認する
