# GitHub Actions ワークフロー

CI / CD のワークフロー定義。設計判断の出所は [ADR 0153](../../docs/adr/0153-ci-configuration.md) で、本書はその実装がどう並んでいるかを示す。

**ワークフロー定義内のコメントは英語で書く**（[AGENTS.md](../../AGENTS.md) 言語規則の明示的な例外。本書を含む `.github/` 配下のドキュメントは日本語）。

## トリガ戦略

| グループ | 走るタイミング | 役割 |
| --- | --- | --- |
| CI Checks | 全 PR | lint / typecheck / build / 起動が壊れていればマージを止める |
| Security | 全 PR + 週次スケジュール | コード・依存・ワークフロー定義・コミット済みシークレットの脆弱性を可視化する |
| Deployment | 保護ブランチへの push | ビルド成果物の配信 |
| Documentation | portal 配信 | 生成ドキュメントの再生成と配信 |

現時点で実体があるのは **CI Checks のみ**。Security は [0110](../../docs/adr/0110-security-operations.md)、Documentation は [0141](../../docs/adr/0141-portal-operations.md) が担当し、それぞれ後続で追加する。

## ワークフロー一覧（CI Checks）

| ワークフロー | ファイル | job 名 | 内容 |
| --- | --- | --- | --- |
| Lint | `lint.yaml` | `lint` | biome（full profile）で Markdown を除くリポジトリ全体を検査する（対象範囲は `biome.json` の `files.includes`） |
| Markdown Lint | `md-lint.yaml` | `md-lint` | markdownlint + mermaid 図の構文を検査する |
| Typecheck | `typecheck.yaml` | `typecheck` | `tsc --noEmit` で型を検査する |
| Build | `build.yaml` | `build` | `next build` が通ることを検査する |
| Smoke | `smoke.yaml` | `smoke` | `next start` を起動し `/` が応答することを検査する |
| Lockfile Drift | `lockfile-drift.yaml` | `lockfile-drift` | ロックファイルが `package.json` と一致し、install が追跡ファイルを書き換えないことを検査する |
| Actions Lint | `actions-lint.yaml` | `actions-lint` | actionlint + shellcheck でワークフロー定義自身を検査する |
| Actions Pin | `actions-pin.yaml` | `actions-pin` | `uses:` が `.github/actions-pin.toml` 通りに SHA 固定されているか検査する |

## hooks mirror CI

`lint` / `md-lint` / `typecheck` / `actions-lint` / `actions-pin` の 5 本は、[lefthook](../../.lefthook.yaml) が回すのと**同じコマンド**を実行する。hook は高速な第一段、CI は権威という二層（[0153](../../docs/adr/0153-ci-configuration.md) §4 / [0151](../../docs/adr/0151-git-hooks.md)）。

残りは片側にしか無い。**どちらが持つかは意図的な配置**であって、揃えるべき漏れではない。

| 検査 | 持っている側 | 理由 |
| --- | --- | --- |
| `build` / `smoke` | CI のみ | フルビルドは hook の速度目標（30 秒）に収まらない。収めようとすれば `--no-verify` の常用を招く |
| `lockfile-drift` | CI のみ | install が追跡ファイルを書き換えたことは、手元では「自分が触った変更」と区別が付かない。第三者の目で見る CI が持つ |
| commitlint | hook のみ | コミット件名の検査。作り直しがコミット単位でしか効かず、PR 到達後に落としても直す手段が rebase になる |
| secret-scan | hook のみ（現時点） | push 前に止めるのが本旨。CI 側は Security グループ（[0110](../../docs/adr/0110-security-operations.md)）で追加する |

## 共通の骨格

全ワークフローが以下を守る。逸脱する場合は ADR の改定が要る。ステップ構成の参照実装は `lint.yaml` で、各ステップが何のためにあるかのコメントもそこに置いてある。

- **actions の SHA ピン** — `uses: owner/repo@<40hex> # <tag>`。moving tag は禁止。**版の SSOT は末尾コメントの tag** であり、tag → SHA の対応は [`../actions-pin.toml`](../actions-pin.toml) が持つ。`make actions-pin-resolve` で解決、`make actions-pin-apply` で反映、`make actions-pin-check` で検査する（`actions-pin` job と pre-commit hook が回す。詳細は [`.makefiles/README.md`](../../.makefiles/README.md)）
- **最小 permissions** — トップレベルは `contents: read`。PR コメントを書く job だけが `pull-requests: write` を加算する
- **concurrency** — `${{ github.workflow }}-${{ github.ref }}` / `cancel-in-progress: true`。同一 PR への連続 push で古い実行を積まない
- **harden-runner** — 全 job 冒頭で egress を `audit` で記録する
- **版数の SSOT は `mise.toml`** — Node / pnpm / actionlint / shellcheck の版はワークフロー側に書かない。mise-action が `mise.toml` から供給する（[0003](../../docs/adr/0003-version-manager.md)）。`matrix` は使わず `ubuntu-latest` 単一
- **例外は mise CLI 自身の版** — `mise.toml` は mise が解決する対象を宣言するもので、mise 自身の版を宣言できない。よって mise-action の `version:` だけが唯一ワークフロー側に書かれた版数であり、全ワークフローに複製されている。更新時は全ファイルを揃えて直すこと

## `paths:` フィルタを使わない

CI Checks のワークフローには `paths:` / `paths-ignore:` を付けない。

`paths:` で絞られたワークフローは、条件に合わない PR では**実行されず、status context も報告しない**。required check に指定した context が報告されないと、GitHub はその PR を「必須チェック待ち」のまま永久にブロックする。埋めるには、同名 job を即成功させる guard ワークフロー（`paths-ignore` に本体の `paths` を裏返しで書いたもの）を対で置くことになる。

本リポの CI Checks はどれも数分で終わり、実行コストよりも「本体と guard の 2 ファイルを常に裏返しの関係に保つ」保守コストのほうが高い。よってフィルタを付けず、全 PR で全 job を走らせる。

将来 `paths:` で絞りたくなるほど重い job（e2e 等）を足す場合は、**guard を対で用意するか、required check から外すか**のどちらかを必ず選ぶこと。片方だけを入れると即座にマージ不能になる。

## PR コメント（upsert-pr-comment）

各 job は検査結果を即 fail させず、いったん capture して [`../actions/upsert-pr-comment`](../actions/upsert-pr-comment/action.yaml) で PR コメントを upsert し、最後に fail-closed で落とす。

- コメントは HTML マーカー（`<!-- lint-result -->` 等）で同定し、**同一 PR では増やさず更新する**。マーカーは job ごとに一意
- 成功時もコメントを更新する。FAIL → PASS で直したときに古い FAIL コメントが残るのを避けるため
- 投稿ステップは `continue-on-error: true`。fork からの PR はトークンが read-only で投稿できないが、それで検査の判定を落とさない
- **検査コマンドに `secrets.*` を `env:` で渡さない**。Actions のシークレットマスキングはランナーがログ表示用に捕捉する経路にしか効かず、`tee` でファイルへ落とした内容は素通りする。そのファイルがこのリポジトリ（public）の PR コメントへそのまま載る

以降のレポーティング（セキュリティスキャン結果 / カバレッジ / 生成物 drift）もすべてこの composite action に乗せる。

## required check

セキュリティ workflow まで揃った時点で、以下の context を branch ruleset の required status checks へ登録する（**GitHub 側の設定はユーザが実施**。[`../settings/branch-protection.json`](../settings/branch-protection.json) も同時に更新する）。

`lint` / `md-lint` / `typecheck` / `build` / `smoke` / `lockfile-drift` / `actions-lint` / `actions-pin`

context 名は**ワークフロー名ではなく job 名**である点に注意。job の rename は required check の設定を黙って無効化する。

## 不採用の判断

| 候補 | 判断 | 理由 |
| --- | --- | --- |
| `sync-versions-check` | 不採用 | `mise.toml` の版数を複製する下流が本リポに存在しない（Dockerfile 無し / CI は mise-action が `mise.toml` を直読み）。検査対象そのものが無い。`package.json` の `engines` / `packageManager` 等、版数の第二宣言を置いた時点で採用する |
| `auto-generate-docs` | 不採用（現時点） | 生成物が 1 つも存在しない。型生成（[0072](../../docs/adr/0072-api-type-generation.md)）と portal 配信（[0141](../../docs/adr/0141-portal-operations.md)）が入る時点で再検討する |
