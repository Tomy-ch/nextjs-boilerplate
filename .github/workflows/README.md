# GitHub Actions ワークフロー

CI / CD のワークフロー定義。設計判断の出所は [ADR 0153](../../docs/adr/0153-ci-configuration.md) で、本書はその実装がどう並んでいるかを示す。

**ワークフロー定義内のコメントは英語で書く**（[AGENTS.md](../../AGENTS.md) 言語規則の明示的な例外。本書を含む `.github/` 配下のドキュメントは日本語）。

## トリガ戦略

| グループ | 走るタイミング | 役割 |
| --- | --- | --- |
| CI Checks | 全 PR | lint / typecheck / build / test / 起動が壊れていればマージを止める |
| Security | 全 PR + 週次スケジュール | コード・依存・ワークフロー定義・コミット済みシークレットの脆弱性を可視化する |
| Deployment | 保護ブランチへの push | ビルド成果物の配信 |
| Documentation | portal 配信 | 生成ドキュメントの再生成と配信 |

実体があるのは **CI Checks** と **Documentation**。Security は [0110](../../docs/adr/0110-security-operations.md) が担当し、後続で追加する。Deployment はアプリ本体の配信先が fork 先の決定であるため（[0011](../../docs/adr/0011-no-docker.md)）本リポには置かない。

## ワークフロー一覧（CI Checks）

| ワークフロー | ファイル | job 名 | 内容 |
| --- | --- | --- | --- |
| Lint | `lint.yaml` | `lint` | biome（full profile）で Markdown を除くリポジトリ全体を検査する（対象範囲は `biome.json` の `files.includes`） |
| Markdown Lint | `md-lint.yaml` | `md-lint` | markdownlint + mermaid 図の構文 + `.claude/**` の意味検査（`skill-lint`）を実行する |
| Typecheck | `typecheck.yaml` | `typecheck` | `tsc --noEmit` で型を検査する |
| Test | `test.yaml` | `test` | アプリ本体（`src` / `docs-viewer` / `tokens` / `mocks`）の Vitest をカバレッジ 100% のハードゲートで実行し、octocov が coverage・差分・実行時間を PR へ報告する |
| Scripts Check | `scripts-check.yaml` | `scripts-check` | 補助スクリプト（`scripts/**`）の Vitest をカバレッジ 100% で実行し、export と describe の 1:1 対応ゲートをリポジトリ全体へ掛ける |
| Build | `build.yaml` | `build` | `next build` が通ることを検査する |
| Smoke | `smoke.yaml` | `smoke` | `next start` を起動し `/` が応答することを検査する |
| Storybook Build | `storybook-build.yaml` | `storybook-build` | `build-storybook` が通ることを検査する。Vitest は story を直接 import するので addon やビルダーの解決までは見ず、`vrt` の build は「比較の前段」なので失敗が別の意味に読める。配信（`deploy-docs`）とは分けている |
| Purge Verify | `purge-verify.yaml` | `purge-verify` | 使い捨てチェックアウトで同梱サンプルを破棄し、破棄後のツリーで整形・検査・build・test が通ることと、過不足・残留参照が無いことを検査する |
| Lockfile Drift | `lockfile-drift.yaml` | `lockfile-drift` | ロックファイルが `package.json` と一致し、install が追跡ファイルを書き換えないことを検査する |
| Tokens Drift | `tokens-drift.yaml` | `tokens-drift` | hand-written token SSOT と追跡する CSS 生成物が一致することを検査する |
| Actions Lint | `actions-lint.yaml` | `actions-lint` | actionlint でワークフロー定義自身を検査し（`run:` のシェルは shellcheck 経由）、composite action の `run:` シェルを `make actions-shellcheck` で、追跡下の `*.sh` を `make shellcheck` で、PR コメントを投稿するジョブへの secret 混入を `make actions-comment-secret-lint` で、mise のピンの整合を `make actions-mise-pin-lint` で検査する |
| Actions Pin | `actions-pin.yaml` | `actions-pin` | `uses:` が `.github/actions-pin.toml` 通りに SHA 固定されているか検査する |
| Images Pin | `images-pin.yaml` | `images-pin` | container image 参照が `docker/images-pin.toml` 通りに digest 固定されているか検査する |
| VisualRegressionTest | `vrt.yaml` | `vrt` / `vrt-comment` | Storybook を build し、digest 固定した Playwright コンテナで全 story を基準画像と比較する。差分のあった story を一覧表で PR へ報告し、画像は artifact（`vrt-diff`）で出す。全数実行では、どの story からも参照されない基準画像が置き場に残っていないことも併せて検査する。比較とコメントを別ジョブに割るのは、基準画像の置き場が非公開なら比較側が App の secret を持つため（secret を持つジョブにコメント本文を作らせない） |

## ワークフロー一覧（Components）

`src/components/**` に触れる PR でだけ走る検査。**`paths:` フィルタを持つため required status check には登録しない**（下記「`paths:` フィルタを使わない」の但し書き）。

| ワークフロー | ファイル | job 名 | 内容 |
| --- | --- | --- | --- |
| Component Classes | `component-classes.yaml` | `classes` | Tailwind が出力しない未定義 class を検出する |
| shadcn Drift | `shadcn-drift.yaml` | `manifest` | 取り込み台帳と実体の乖離、および上流の更新を検出する |

## ワークフロー一覧（イベント駆動）

PR ごとには走らず、ラベルや保護ブランチへの push で起動する。**required status check には登録しない**（起動しない PR では context が報告されないため）。

| ワークフロー | ファイル | job 名 | 内容 |
| --- | --- | --- | --- |
| VRT Retake | `vrt-retake.yaml` | `retake` / `report` | VRT の**完了**で発火し、`vrt-retake` ラベルが付いていれば、その実行が報告した story の基準画像を撮り直し、置き場へ push してサブモジュールのポインタを進める。ラベルはトリガではなく条件なので、PR 作成時に付けておける（VRT の完了を待つ必要がない）。他のチェックが落ちている間は撮らずに見送り、ラベルを残す（次の実行で自動的に再開する）。`revert-` で始まるブランチではラベル無しで全数を撮り直す（掃除で復帰先の一式が消えているため）。ポインタの push は `GITHUB_TOKEN` ではなく App のトークンで行う（`GITHUB_TOKEN` の push は実行を起こさないため、確認用の VRT が走らない）。**承認ではない** — 画素の判断は置き場の compare ビューを見て PR レビューで行う |
| VRT Guard | `vrt-guard.yaml` | `guard` | 保護ブランチへの push 後に story の比較をやり直す。通常は鳴らない（PR はマージ結果に対して判定され、ブランチは最新であることを要求されるため）。鳴ったら前提が崩れた合図として issue を立てる。**基準画像は撮り直さない** |
| VRT Images Prune | `vrt-images-prune.yaml` | `report` | 月次で基準画像の置き場を測り、閾値を超えたときだけ掃除を促す issue を立てる。**消さない** — 履歴の書き換えは取り消せないので、実行は人が `make vrt-images-prune` で起こす |

## ワークフロー一覧（Documentation）

| ワークフロー | ファイル | job 名 | 内容 |
| --- | --- | --- | --- |
| Deploy Docs | `deploy-docs.yaml` | `build` / `deploy` | 生成 HTML のドキュメントサイトを組んで GitHub Pages へ配信する（[0141](../../docs/adr/0141-portal-operations.md)） |

サイトは**単一のツリーに複数の生成物を同居させる**形を採る。GitHub Pages はリポジトリに 1 サイトしか持てないため、Storybook・portal・coverage のような生成 HTML はそれぞれサイト直下の兄弟パスへ入り、ルートは入口へ転送するだけの薄い層（[`../../docs/index.html`](../../docs/index.html)）に留める。

| パス | 中身 |
| --- | --- |
| `/` | 入口（`/portal/`）への転送 |
| `/portal/` | docs portal（[0141](../../docs/adr/0141-portal-operations.md)）。`pnpm portal:build` の出力 |
| `/storybook/` | Storybook（`pnpm build-storybook` の出力） |
| `/<dir>/`, `/*.md` | `docs/` の内容そのまま。portal のカードが `../<dir>/<file>` で参照する |

`docs/` をサイトルートへ写すのは、走査で自動発見したドキュメントへの相対経路（`../<dir>/<file>`）を成立させるため。ここを削ると自動発見のカードが全て死にリンクになる。

配信の発火は `production` への push（＋任意 ref から回すための `workflow_dispatch`）。`paths:` フィルタは付けない — 理由は下記「`paths:` フィルタを使わない」と同じではなく、リリースが間接的な経路（token・依存更新・設定）で見た目を変えうるため、対象パスを予測して並べる保守コストのほうが高いという判断による。

この workflow 自身を編集する PR では、`build` だけが自己検査として走る（`deploy` は `pull_request` を除外している）。配信の壊れは、それを必要とするリリースまで気付けないため。この PR 用の実行は **required status check へ登録しない** — 当該ファイルに触れない PR では context が報告されず、必須待ちで止まる。

**GitHub Pages の有効化はユーザが Settings で実施する**（ワークフロー側で `actions/configure-pages` による自動有効化はしない）。有効化前に走った実行は deploy job で失敗する。

## required status check

[`../settings/branch-protection.json`](../settings/branch-protection.json) が **CI Checks 群を必須**にし、`strict` でブランチが最新であることを要求する。これは VRT が成立する条件でもある — 判定しているのは base へマージした結果の木（`refs/pull/N/merge`）なので、base が動いた後の緑をそのまま通すと、基準画像が「実際にマージされる木」とずれる。

`paths:` フィルタを持つ 3 つ（`classes` / `manifest` / `deploy-docs` の `build`）は登録しない。触らない PR では context が報告されず、必須待ちで止まるため。

> `deploy-docs.yaml` の job 名が `build.yaml` と衝突しており、必須に登録した `build` はどちらにも一致する。docs を触る PR では両方が緑である必要があり、実害は無いが名前は分けたほうがよい。

## mise の導入

Node / pnpm などの供給は composite action [`../actions/setup-mise`](../actions/setup-mise/action.yaml) が行う。全ジョブが mise を必要とするため、**取得は必ずリトライを持ち、一度取ったものは再利用できなければならない** — 配信側の一時的な不調が、そのまま全ジョブの失敗になる位置にある。

この action が持つもの:

| | |
| --- | --- |
| リトライ | `curl --retry 5 --retry-all-errors`。取得はファイルへ落としてから検証する（パイプのままだと部分受信分がシェルへ流れ込む） |
| キャッシュ | 固定した版と digest をキーにバイナリを保持する |
| **digest の照合** | 復元・取得のどちらの経路でも、実行前に SHA256 を照合する。合わなければ捨てて取り直し、それでも合わなければ落とす |

**照合が要るのは、Actions のキャッシュが信頼境界ではないから。**キャッシュはブランチを跨いで共有され、push 権限があれば中身を差し替えられる。そこに置くのが実行可能バイナリなので、照合を挟まなければキャッシュ汚染がそのまま CI 内の任意コード実行になる。`uses:` を SHA で、container image を digest で固定しているのと同じ理由・同じ形。

### mise の版を上げる

1. 上流の `SHASUMS256.txt` から `mise-v<版>-linux-x64` の SHA256 を取る

   ```bash
   curl -sSL "https://github.com/jdx/mise/releases/download/v<版>/SHASUMS256.txt" | grep 'linux-x64$'
   ```

2. [`../actions/setup-mise/action.yaml`](../actions/setup-mise/action.yaml) の `MISE_VERSION` / `MISE_SHA256` と、キャッシュキーの版・digest 接頭辞を揃えて直す

## hooks mirror CI

`lint` / `md-lint` / `typecheck` / `actions-lint` / `actions-pin` / `images-pin` の 6 本は、[lefthook](../../.lefthook.yaml) が回すのと**同じコマンド**を実行する。`test` は二層実行で、pre-commit の `make test-cached` に対し、pre-push と CI は `make test-full` を実行する。hook は高速な第一段、CI は権威という二層（[0153](../../docs/adr/0153-ci-configuration.md) §4 / [0151](../../docs/adr/0151-git-hooks.md)）。

残りは片側にしか無い。**どちらが持つかは意図的な配置**であって、揃えるべき漏れではない。

| 検査 | 持っている側 | 理由 |
| --- | --- | --- |
| `build` / `smoke` | CI のみ | フルビルドは hook の速度目標（30 秒）に収まらない。収めようとすれば `--no-verify` の常用を招く |
| `test` | pre-push + CI | pre-commit は開発中の反復を優先して cache を使い、push 前と CI は coverage を含む完全実行で gate を掛ける |
| `scripts-check` | pre-push + CI | `test` と同じ二層。job を `test` と分けるのは、`scripts/` に居るのが検査機構そのもので、壊れると「違反なし」を報告する向きに倒れるため。赤の意味を「機構が壊れた」と「アプリが退行した」で取り違えない |
| `purge-verify` | CI のみ | 破棄は取り消せないので、hook では走らせない。使い捨てチェックアウトを前提にした検査であり、手元のツリーで回すと作業中のサンプルが消える |
| `lockfile-drift` | CI のみ | install が追跡ファイルを書き換えたことは、手元では「自分が触った変更」と区別が付かない。第三者の目で見る CI が持つ |
| commitlint | hook のみ | コミット件名の検査。作り直しがコミット単位でしか効かず、PR 到達後に落としても直す手段が rebase になる |
| secret-scan | hook のみ（現時点） | push 前に止めるのが本旨。CI 側は Security グループ（[0110](../../docs/adr/0110-security-operations.md)）で追加する |

## 共通の骨格

全ワークフローが以下を守る。逸脱する場合は ADR の改定が要る。ステップ構成の参照実装は `lint.yaml` で、各ステップが何のためにあるかのコメントもそこに置いてある。

- **actions の SHA ピン** — `uses: owner/repo@<40hex> # <tag>`。moving tag は禁止。**版の SSOT は末尾コメントの tag** であり、tag → SHA の対応は [`../actions-pin.toml`](../actions-pin.toml) が持つ。`make actions-pin-resolve` で解決、`make actions-pin-apply` で反映、`make actions-pin-check` で検査する（`actions-pin` job と pre-commit hook が回す。詳細は [`.makefiles/README.md`](../../.makefiles/README.md)）
- **最小 permissions** — トップレベルは `contents: read`。PR コメントを書く job だけが `pull-requests: write` を加算する
- **concurrency** — `${{ github.workflow }}-${{ github.ref }}` / `cancel-in-progress: true`。同一 PR への連続 push で古い実行を積まない。**配信系だけは例外**で、group に共有リソース名（`pages`）を置き `cancel-in-progress: false` とする（[0153](../../docs/adr/0153-ci-configuration.md) §3）。配信先は ref ごとに存在せず 1 つしかなく、走行中の deploy を切ると公開中のサイトが途中まで転送された成果物を配る
- **harden-runner** — 全 job 冒頭で egress を `audit` で記録する
- **版数の SSOT は `mise.toml`** — Node / pnpm / actionlint / shellcheck の版はワークフロー側に書かない。[`../actions/setup-mise`](../actions/setup-mise/action.yaml) が `mise.toml` から供給する（[0003](../../docs/adr/0003-version-manager.md)）。`matrix` は使わず `ubuntu-latest` 単一
- **例外は mise CLI 自身の版** — `mise.toml` は mise が解決する対象を宣言するもので、mise 自身の版を宣言できない。この 1 つだけは `setup-mise` の中に**版と SHA256 の対で**書かれている（[下記](#mise-の導入)）

## `paths:` フィルタを使わない

CI Checks のワークフローには `paths:` / `paths-ignore:` を付けない。

`paths:` で絞られたワークフローは、条件に合わない PR では**実行されず、status context も報告しない**。required check に指定した context が報告されないと、GitHub はその PR を「必須チェック待ち」のまま永久にブロックする。埋めるには、同名 job を即成功させる guard ワークフロー（`paths-ignore` に本体の `paths` を裏返しで書いたもの）を対で置くことになる。

本リポの CI Checks はどれも数分で終わり、実行コストよりも「本体と guard の 2 ファイルを常に裏返しの関係に保つ」保守コストのほうが高い。よってフィルタを付けず、全 PR で全 job を走らせる。

将来 `paths:` で絞りたくなるほど重い job（e2e 等）を足す場合は、**guard を対で用意するか、required check から外すか、job は起動させたまま中の重いステップを `if:` で落とすか**のどれかを必ず選ぶこと。片方だけを入れると即座にマージ不能になる。

3 つ目が `vrt` の採る形である。job 名を変えずに必ず起動するので context は常に報告され、guard も required からの除外も要らない。無関係な PR が払うのは checkout と判定ステップだけになる。

**述語は「絵を動かさない」と言い切れるパスの allowlist にすること。** denylist は漏れた瞬間に fail-open する — 新しいパスが漏れた日から比較が黙って止まり、job は何も比べないまま「差分なし」を報告する。安全に書けるのは `docs/**` / `**/*.md` / `.claude/**` / `.agents/**` と `**/*.test.ts` / `**/*.test.tsx`（いずれも Storybook のバンドルに入らない）程度で、**「`.tsx` が変わったか」で発火させることはできない**。Tailwind の class 文字列は `*.definition.ts`、CSS 基盤は `foundation/*.css`、token の SSOT は `tokens/**`、フォントのラスタライズは `docker/images-pin.toml` の digest にあり、`.tsx` を触らずに絵が変わる経路が設計として複数ある（依存更新も同じ）。判定できなかったとき（API が答えない・一覧が切り詰められた）は必ず「実行する」側へ倒すこと。

`component-classes` / `shadcn-drift` は `paths:` を持つため、**後者（required check から外す）を選んでいる**。この 2 本を required へ登録するなら、同時に裏返しの guard を対で用意すること。

## PR コメント（検査ログ: upsert-pr-comment）

coverage 以外の各 job は検査結果を即 fail させず、いったん capture して [`../actions/upsert-pr-comment`](../actions/upsert-pr-comment/action.yaml) で PR コメントを upsert し、最後に fail-closed で落とす。

- コメントは HTML マーカー（`<!-- lint-result -->` 等）で同定し、**同一 PR では増やさず更新する**。マーカーは job ごとに一意
- 成功時もコメントを更新する。FAIL → PASS で直したときに古い FAIL コメントが残るのを避けるため
- 投稿ステップは `continue-on-error: true`。fork からの PR はトークンが read-only で投稿できないが、それで検査の判定を落とさない
- **検査コマンドに `secrets.*` を `env:` で渡さない**。Actions のシークレットマスキングはランナーがログ表示用に捕捉する経路にしか効かず、`tee` でファイルへ落とした内容は素通りする。そのファイルがこのリポジトリ（public）の PR コメントへそのまま載る。`GITHUB_TOKEN` だけが例外（投稿そのものに要る短命トークン）。この規約は `make actions-comment-secret-lint` が機械検査するが、追えるのは `${{ }}` 式の直接参照までで、`needs.<job>.outputs` 経由の間接渡しは検査を通る — **規約が正であり、検査は退行ガード**
- **既存コメントの同定は「bot 投稿者」と「マーカーで始まること」の両方を要求する**。public リポジトリでは第三者がマーカー入りのコメントを先に投稿でき、かつ全ワークフローが同じ bot で投稿するため、どちらか片方では同定にならない（別ワークフローのマーカーを検査ログへ出力させれば、そのワークフローを誤ったコメントへ誘導できる）。この前提として `github-token` には **bot として投稿するトークンを渡す** — 個人の PAT では投稿できても二度と更新できない
- **本文の折り畳みに使うフェンスは本文から決める**。検査ログには linter やコンパイラがソース行をそのまま出力するので、その中身は PR 提出者が制御できる。固定の 3 連バッククォートで囲むと本文自身がフェンスを閉じ、以降が生 Markdown としてレンダリングされる（mention による第三者への通知、偽の見出しやリンクが CI bot の名義で載る）。呼び出し側は自前でフェンスを組み立てず `details-summary` を使うこと（撤回条件 W12）
- **`title` と `details-summary` には静的リテラルだけを渡す**。無害化が効くのは本文（`body-file`）だけで、`title` は生 Markdown、`details-summary` は生 HTML としてフェンスの**外**に置かれる。ログの中身を要約して `title` に載せるような変更を入れると、フェンスで塞いだ注入が外側から復活する

カバレッジだけは、行単位の coverage と基準ブランチとの差分を構造化して報告する必要があるため、`test.yaml` の octocov が専用コメントを投稿する。ほかの検査ログ（セキュリティスキャン結果 / 生成物 drift を含む）はこの composite action に乗せる。

## required check

セキュリティ workflow まで揃った時点で、以下の context を branch ruleset の required status checks へ登録する（**GitHub 側の設定はユーザが実施**。[`../settings/branch-protection.json`](../settings/branch-protection.json) も同時に更新する）。

`lint` / `md-lint` / `typecheck` / `test` / `build` / `smoke` / `lockfile-drift` / `tokens-drift` / `actions-lint` / `actions-pin`

context 名は**ワークフロー名ではなく job 名**である点に注意。job の rename は required check の設定を黙って無効化する。

## 不採用の判断

| 候補 | 判断 | 理由 |
| --- | --- | --- |
| `sync-versions-check` | 不採用 | `mise.toml` の版数を複製する下流が本リポに存在しない（Dockerfile 無し / CI は `setup-mise` が `mise.toml` を直読み）。検査対象そのものが無い。`package.json` の `engines` / `packageManager` 等、版数の第二宣言を置いた時点で採用する |
| `auto-generate-docs` | 不採用 | portal の生成物（`guides/` / `docs.json`）は追跡せず配信時に組み立てるため、drift が発生しえない。追跡する生成物を持つのは型生成（[0072](../../docs/adr/0072-api-type-generation.md)）が入る時点で、そこで再検討する |
