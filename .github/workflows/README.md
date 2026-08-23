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

実体があるのは **CI Checks** / **Security** / **Documentation**。Deployment はアプリ本体の配信先が fork 先の決定であるため（[0011](../../docs/adr/0011-no-docker.md)）本リポには置かない。

## ワークフロー一覧（CI Checks）

| ワークフロー | ファイル | job 名 | 内容 |
| --- | --- | --- | --- |
| Lint | `lint.yaml` | `lint` | biome（full profile）で Markdown を除くリポジトリ全体を検査する（対象範囲は `biome.json` の `files.includes`） |
| Markdown Lint | `md-lint.yaml` | `md-lint` | markdownlint + mermaid 図の構文 + `.claude/**` の意味検査（`skill-lint`）を実行する |
| Typecheck | `typecheck.yaml` | `typecheck` | `tsc --noEmit` で型を検査する |
| Test | `test.yaml` | `test` | アプリ本体（`src` / `docs-viewer` / `tokens` / `mocks`）の Vitest をカバレッジ 100% のハードゲートで実行し、octocov が coverage・差分・実行時間を PR へ報告する |
| Scripts Check | `scripts-check.yaml` | `scripts-check` | 補助スクリプト（`scripts/**`）の Vitest をカバレッジ 100% で実行し、export と describe の 1:1 対応ゲートをリポジトリ全体へ掛ける |
| Build | `build.yaml` | `build` | `next build` が通ることを検査する |
| Bundle Budget | `bundle-budget.yaml` | `bundle-budget` | route ごとに browser が最初に読む client JS を測り、`performance-budget.yaml` の上限と base からの増分に照らす |
| Dead Code | `dead-code.yaml` | `dead-code` | どの入口からも到達しない file / export / dependency を検出する。`src/components/**` は fork 先が使う口として入口に宣言し、未使用を問わない |
| Smoke | `smoke.yaml` | `smoke` | `next start` を起動し `/` が応答することを検査する |
| Storybook Build | `storybook-build.yaml` | `storybook-build` | `build-storybook` が通ることを検査する。Vitest は story を直接 import するので addon やビルダーの解決までは見ず、`vrt` の build は「比較の前段」なので失敗が別の意味に読める。配信（`deploy-docs`）とは分けている |
| Purge Verify | `purge-verify.yaml` | `purge-verify` | 使い捨てチェックアウトで同梱サンプルを破棄し、破棄後のツリーで整形・検査・build・test が通ることと、過不足・残留参照が無いことを検査する |
| Strip Verify | `strip-verify.yaml` | `strip-verify` | 使い捨てチェックアウトで boilerplate 限定の記述を剥がし、剥がした後のツリーで整形・検査・build・test が通ることと、マーカーが 1 件も残っていないことを検査する。**剥がしの対象に自分自身を含む**（[`../../scripts/setup/remove-boilerplate-only/manifest.ts`](../../scripts/setup/remove-boilerplate-only/manifest.ts) の `SELF_DESTRUCT_PATHS`）。剥がしは任意ではないので、fork には検証する相手が残らない <!-- boilerplate-only:line --> |
| Lockfile Drift | `lockfile-drift.yaml` | `lockfile-drift` | ロックファイルが `package.json` と一致し、install が追跡ファイルを書き換えないことを検査する |
| Tokens Drift | `tokens-drift.yaml` | `tokens-drift` | hand-written token SSOT と追跡する CSS 生成物が一致することを検査する |
| Actions Lint | `actions-lint.yaml` | `actions-lint` | actionlint でワークフロー定義自身を検査し（`run:` のシェルは shellcheck 経由）、composite action の `run:` シェルを `make actions-shellcheck` で、追跡下の `*.sh` を `make shellcheck` で、PR コメントを投稿するジョブへの secret 混入を `make actions-comment-secret-lint` で、mise のピンの整合を `make actions-mise-pin-lint` で、必須ステータスチェックの宣言と実体の突合を `make actions-required-check-lint` で、定義そのものの静的解析を `make actions-zizmor` で検査する |
| Actions Pin | `actions-pin.yaml` | `actions-pin` | `uses:` が `.github/actions-pin.toml` 通りに SHA 固定されているか検査する |
| Images Pin | `images-pin.yaml` | `images-pin` | container image 参照が `docker/images-pin.toml` 通りに digest 固定されているか検査する |
| Accessibility | `a11y.yaml` | `a11y` / `a11y-comment` | 全 story に axe を掛ける。撮影と同じ digest 固定コンテナに相乗りするので追加のランナーを入れない（ADR 0091 §3）。**実ブラウザなので色コントラストまで届く** — component テストの `vitest-axe` は jsdom で走るため contrast を無効化している。検査するのは撮影と同じ 1 テーマだけで、片テーマでだけ出る違反は届かない（[`vrt/README.md`](../../vrt/README.md)）。VRT と job を分けるのは、a11y の失敗が撮り直しの対象に入ると、撮り直しても直らないまま基準画像だけが承認済みになるため。VRT と同じく、省く判定は 2 層ある — PR の差分が story に届かなければ CI の入口で丸ごと降り、届いても絵を決める入力が前に通った時点と同じなら axe を省く（[`vrt/README.md`](../../vrt/README.md)） |
| E2E | `e2e.yaml` | `e2e` / `e2e-comment` | build したアプリを実際のブラウザで動かす。主要ジャーニー・ブラウザが報告する異常（hydration の不一致 / 描画中の例外 / 通信の失敗）・帯ごとの出し分けを 3 つの描画エンジンで回し、画面単位の見た目を基準画像と比べる（[`e2e/README.md`](../../e2e/README.md)）。**見ているのは 3 つの描画エンジンだけで、ブラウザの銘柄も版も見ていない** —— モダンブラウザ（[0102](../../docs/adr/0102-browser-support.md)）が実装として畳まれる先が Chromium / Firefox / WebKit であり、版は digest 固定したイメージが決める。アプリはランナーで起動し、コンテナで動かすのはブラウザだけ（`node_modules` は入れた OS と CPU 向けに解決されるため）。比較とコメントを別ジョブに割る理由は VRT と同じ |
| Baseline Approval | `baseline-approval.yaml` | `baseline-approval` | 基準画像が動いている PR で `baseline-approve` ラベルを要求する。ラベルの有無だけでなく、付いた時刻がポインタを動かした最後のコミットより後であることを見る（古い承認を新しい一式へ持ち越さない）。PR のレビュー承認を使わないのは、承認の対象が PR 全体ではなく基準画像であるため（[`vrt/README.md`](../../vrt/README.md)） |
| VisualRegressionTest | `vrt.yaml` | `vrt` / `vrt-comment` | Storybook を build し、digest 固定した Playwright コンテナで全 story を基準画像と比較する。差分のあった story を一覧表で PR へ報告し、画像は artifact（`vrt-diff`）で出す。全数実行では、基準画像と撮影対象が 1 対 1 で対応することも併せて検査する。省く判定は 2 層ある — PR の差分が絵に届かなければ CI の入口で丸ごと降り、届いても `make vrt` が絵を決める入力のハッシュを基準画像を撮った時点の値と突き合わせ、一致していれば比較を省く（[`vrt/README.md`](../../vrt/README.md)）。比較とコメントを別ジョブに割るのは、基準画像の置き場が非公開なら比較側が App の secret を持つため（secret を持つジョブにコメント本文を作らせない） |

### 並列度に台数を書かない

`a11y` だけが `--workers=100%` を渡し、`vrt` は Playwright の既定（論理コア数の半分）に任せる。`a11y` は違反の有無を見るだけだが、VRT は画素を比較するので、並列度が撮影のタイミングに影響しうる。

どちらも**台数は書かない**。standard runner のコア数は public リポジトリで 4、private で 2 であり、fork 先が受け取るのは後者。台数を書けばこのリポジトリの事情がそのまま fork 先の既定になる。割合指定なら、その意思だけが渡ってコア数は実行環境が決める。

大きいランナーを使う fork 側で調整したい場合の口は `VRT_ARGS` で、`make vrt` / `make a11y` の双方が受け取る（[`.makefiles/testing/vrt.mk`](../../.makefiles/testing/vrt.mk)）。

## ワークフロー一覧（Security）

多層防御（[0110](../../docs/adr/0110-security-operations.md)）。**全 PR + 週次スケジュール**で走る。週次があるのは、
コードが 1 行も動いていない木に対しても CVE が公開されうるためで、変更を入口にした検査だけでは届かない。

| ワークフロー | ファイル | job 名 | 内容 |
| --- | --- | --- | --- |
| Secret Scan | `gitleaks.yaml` | `secret-scan` | PR が足したコミットを gitleaks で走査する。週次は履歴全体。検出は fail-closed |
| CodeQL Scan | `codeql.yaml` | `codeql` | 自分が書いたコードの SAST。high の検出でマージを止めるのは code scanning 側の設定で、この job が落ちるのは解析そのものが走らなかったときだけ |
| Dependency Scan | `dependency-scan.yaml` | `dependency-scan` / `dependency-audit` / `dependency-gate` | 依存の脆弱性。同じ対象に 3 つの異なる判定を掛ける（下記） |

### 依存の脆弱性は、3 つの判定が同じ対象を見る

| job | 手段 | 落ちる条件 |
| --- | --- | --- |
| `dependency-scan` | `make trivy-fs` | **検出では落ちない。** スキャナが走らなかったときだけ落ちる |
| `dependency-audit` | `make audit` | 修正版のある `high` / `critical` が 1 件でもあれば落ちる |
| `dependency-gate` | `make trivy-fs-release` | 保護ブランチ宛 PR でだけ起動し、検出があれば落ちる |

**報告専用の job が要るのは、脆弱性が「変更の作者がその場で解消できない」うえ「変更と独立に状態が変わる」ため。**
それでゲートを組むと `--no-verify` と同じ経路を CI 側に作る。止める場所は昇格（保護ブランチ宛 PR）の一点で、
そこは誰かがリスクを引き受けて判断する場面である（[0110](../../docs/adr/0110-security-operations.md) 3.1）。

**Trivy と `pnpm audit` の件数は一致しない。突合して差分を潰そうとしない。** 集計単位（CVE / advisory）も参照する
DB も違うので、片方だけを正とするとそのツールが見ない領域が恒久的な死角になる。**和集合が正**で、どちらか一方でも
閾値に達したものを blocking として扱う。

`dependency-gate` が `branches:` フィルタではなく `if:` で降りるのは required check の都合による（下記「required status check」）。

## ワークフロー一覧（Components）

design system の部品（`src/components/**`）を対象にした検査。走るのは他の CI Checks と同じく**全 PR**で、
どちらも required status check に登録している。

| ワークフロー | ファイル | job 名 | 内容 |
| --- | --- | --- | --- |
| Component Classes | `component-classes.yaml` | `component-classes` | Tailwind が出力しない未定義 class を検出する |
| shadcn Drift | `shadcn-drift.yaml` | `shadcn-manifest` / `upstream` | 取り込み台帳と実体の乖離（`shadcn-manifest`）、および上流の更新（`upstream`）を検出する |

`upstream` はネットワークに出るため PR では降ろしており（`if:`）、週次スケジュールでだけ走る。**登録しない** —
上流が動いたという、PR の著者に直せない理由で作業を止めるため。

## ワークフロー一覧（イベント駆動）

PR ごとには走らず、ラベルや保護ブランチへの push で起動する。**required status check には登録しない**（起動しない PR では context が報告されないため）。

> **`workflow_run` で起動するものは、既定ブランチの定義で走る。** `baseline-retake` がこれに当たる。
> job は PR のブランチを checkout するので**コードは PR のもの**だが、**ワークフロー定義そのもの
> （`env:` や `uses:` を含む）は既定ブランチのもの**が使われる。PR のブランチで定義を直しても、
> その PR に対する実行には効かない — 既定ブランチへ入るまで反映されない。定義の修正が要る
> ときは、その PR とは別に既定ブランチへ入れる必要がある。

| ワークフロー | ファイル | job 名 | 内容 |
| --- | --- | --- | --- |
| Baseline Retake | `baseline-retake.yaml` | `retake` / `report` | VRT または E2E の**完了**で発火し、`baseline-retake` ラベルが付いていれば、**story と画面の基準画像をまとめて**撮り直し、置き場へ push してサブモジュールのポインタを進める。story は報告された差分だけ、画面は全数が対象（E2E は差分の報告を出さない）。両方が赤いときは E2E 側の実行が VRT 側へ譲る —— 片方だけでラベルを使い切らないためで、これが「1 ラベル 1 撮り直し」を保つ。ラベルはトリガではなく条件なので、PR 作成時に付けておける（VRT の完了を待つ必要がない）。**絵を動かしうるチェック**（`baseline-retake.yaml` の `DECIDES_PIXELS` が名指しする）が落ちている間は撮らずに見送り、ラベルを残す（次の実行で自動的に再開する）。見るのは各チェックの最新の試行だけで、名指しは allowlist である — 落ちているもの全部を数えると、撮るまで存在しない画像を待つ `baseline-approval` と互いに待ち合う。`revert-` で始まるブランチではラベル無しで全数を撮り直す（掃除で復帰先の一式が消えているため）。ポインタの push は `GITHUB_TOKEN` ではなく App のトークンで行う（`GITHUB_TOKEN` の push は実行を起こさないため、確認用の VRT が走らない）。**承認ではない** — 画素の判断は置き場の compare ビューを見て PR レビューで行う |
| VRT Guard | `vrt-guard.yaml` | `guard` | 保護ブランチへの push 後に story の比較をやり直す。通常は鳴らない（PR はマージ結果に対して判定され、ブランチは最新であることを要求されるため）。鳴ったら前提が崩れた合図として issue を立てる。**基準画像は撮り直さない** |
| Lighthouse | `lighthouse.yaml` | `lighthouse` | 保護ブランチへの push と毎日 1 回、`e2e/lib/screens.ts` が宣言する画面を 1 枚ずつ Lighthouse で開き、LCP / CLS / TBT を `performance-budget.yaml` の上限と照らす（[0101](../../docs/adr/0101-performance-budget.md)）。落ちたら issue を立てる（ブランチごとに 1 本、2 度目は同じ issue へコメント）。**performance スコアは見ない** —— 5 指標の加重平均は、下がったときにどれが下がったかを答えられない。INP は実ユーザの操作を要して lab では測れないため TBT が代わる。撮影（`vrt` / `a11y` / `e2e`）と違ってブラウザをコンテナへ閉じ込めないのは、比べるのが画素ではなく数値だから —— 固定すべきはフォントのラスタライズではなくブラウザの版で、それは lockfile が担う。**PR でも起動はするが、測るのは差分が要求したときだけ** —— 画面の宣言か器が動いていれば待たずに測り、token とロジックの変更量が `performance-budget.yaml` の線を超えていれば「測っておくと安全」とコメントする（ゲートではない）。**全量を PR で回さない理由は実測にある** —— 計測は直列でしか成立せず（同時に測ると並列度そのものが数値へ混ざる）、23 画面 × 3 試行 × 約 14 秒 ≒ 16 分に対し build は約 1 分。費用は `画面数 × 試行回数` に張り付いており、試行を削れば runner のぶれを吸う中央値を失い、画面を削れば宣言から全数を引く意味を失う。**削るなら網羅ではなく頻度**という判断で、検知が 1 マージぶん遅れる代わりに PR は 1 秒も待たない |
| Baseline Prune | `baseline-prune.yaml` | `report` | 月次で基準画像の置き場を測り、閾値を超えたときだけ掃除を促す issue を立てる。**消さない** — 履歴の書き換えは取り消せないので、実行は人が `make baseline-prune` で起こす |

## ワークフロー一覧（Documentation）

| ワークフロー | ファイル | job 名 | 内容 |
| --- | --- | --- | --- |
| Deploy Docs | `deploy-docs.yaml` | `docs-build` / `docs-deploy` | 生成 HTML のドキュメントサイトを組んで GitHub Pages へ配信する（[0141](../../docs/adr/0141-portal-operations.md)） |

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

**登録してよいのは、すべての PR でその名前を報告し続ける job だけ。**報告されない context を登録すると、GitHub はその PR を「必須チェック待ち」のまま永久にブロックする。`deploy-docs` の `docs-build` は `paths:` で自分自身の変更に絞ってあるため登録しない。

この条件は `make actions-required-check-lint` が機械検査する（`actions-lint` job と pre-commit が回す）。落ちる条件は `.makefiles/README.md` が持つ（[`.makefiles/README.md`](../../.makefiles/README.md)）。

`diff-scope` で降りる job は登録してよい。job 名も context の報告も変わらず、変わるのは中のステップが走るかどうかだけであるため（下記「`paths:` フィルタを使わない」）。

context 名は**ワークフロー名ではなく job 名**である点に注意。job の rename は required status check の設定を黙って無効化する。同じ理由で、**別々のワークフローに同じ job 名を置かない** — 報告される check run が 1 つの名前に 2 つ並び、必須がどちらを指すのか決まらなくなる。`deploy-docs` の job が `docs-build` / `docs-deploy` と配信先で名乗るのはこのため。

<!-- boilerplate-only:replace-begin -->
**fork の初期化を生き延びないジョブ（`purge-verify` / `strip-verify`）も登録しない。** `strip-verify` は剥がしで自分ごと消え、消えた後は context を報告しない。`purge-verify` は残るが、破棄を済ませた fork では「破棄済みなのでこのワークフローを消せ」と赤で止まる設計であり、指示どおり消せば同じく報告されなくなる。`branch-protection.json` は JSON でコメントを持てず削除のマーカーを置けないので、登録すると初期化を済ませた fork のすべての PR が必須待ちで止まる。
<!-- boilerplate-only:replace-with -->
<!-- = **`purge-verify` は登録しない。** サンプルを破棄した後は「破棄済みなのでこのワークフローを消せ」と赤で止まる設計で、指示どおり消せば context を報告しなくなる。`branch-protection.json` は JSON でコメントを持てず削除のマーカーを置けないので、登録すると破棄を済ませた後のすべての PR が必須待ちで止まる。 -->
<!-- boilerplate-only:replace-end -->

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
| `bundle-budget` | CI のみ | 同上。しかも base ブランチの build も要るため、手元では 2 回分かかる |
| `lighthouse` | CI のみ | 同上に加えて、画面数 × 試行回数だけブラウザを回すため hook の速度目標から桁で外れる。**PR では走らない**（下の「イベント駆動」を参照）。手元の入口は `make lighthouse` |
| `dead-code` | CI のみ | 到達可能性はワークスペース全体を解決してから判定する。作業中のツリーでは書きかけの import が未使用として鳴り、hook で止めると押し切る癖が付く |
| `test` | pre-push + CI | pre-commit は開発中の反復を優先して cache を使い、push 前と CI は coverage を含む完全実行で gate を掛ける |
| `scripts-check` | pre-push + CI | `test` と同じ二層。job を `test` と分けるのは、`scripts/` に居るのが検査機構そのもので、壊れると「違反なし」を報告する向きに倒れるため。赤の意味を「機構が壊れた」と「アプリが退行した」で取り違えない |
| `purge-verify` | CI のみ | 破棄は取り消せないので、hook では走らせない。使い捨てチェックアウトを前提にした検査であり、手元のツリーで回すと作業中のサンプルが消える |
| `strip-verify` | CI のみ | 同上。手元のツリーで回すと boilerplate 限定の記述が剥がれ、剥がしの道具ごと消える <!-- boilerplate-only:line --> |
| `lockfile-drift` | CI のみ | install が追跡ファイルを書き換えたことは、手元では「自分が触った変更」と区別が付かない。第三者の目で見る CI が持つ |
| commitlint | hook のみ | コミット件名の検査。作り直しがコミット単位でしか効かず、PR 到達後に落としても直す手段が rebase になる |
| secret-scan | hook + CI | 同じ `make secret-scan` を呼ぶが、**走査範囲の決まり方が違う**。hook の既定は「どのリモートにも無いコミット」で、PR のブランチは既に push 済みなので CI では 0 件になる。CI は `SECRET_SCAN_LOG_OPTS` で base からの範囲を渡す。履歴全体は週次だけ（`make secret-scan-history`） |
| 依存の脆弱性 | CI のみ | 変更の作者がその場で解消できず、変更と独立に状態が変わる。hook に載せると `--no-verify` の常用を教える（[0110](../../docs/adr/0110-security-operations.md) 3.1 / 撤回条件 W1・W2） |

## 共通の骨格

全ワークフローが以下を守る。逸脱する場合は ADR の改定が要る。ステップ構成の参照実装は `lint.yaml` で、各ステップが何のためにあるかのコメントもそこに置いてある。

- **actions の SHA ピン** — `uses: owner/repo@<40hex> # <tag>`。moving tag は禁止。**版の SSOT は末尾コメントの tag** であり、tag → SHA の対応は [`../actions-pin.toml`](../actions-pin.toml) が持つ。`make actions-pin-resolve` で解決、`make actions-pin-apply` で反映、`make actions-pin-check` で検査する（`actions-pin` job と pre-commit hook が回す。詳細は [`.makefiles/README.md`](../../.makefiles/README.md)）
- **最小 permissions** — トップレベルは `contents: read`。PR コメントを書く job だけが `pull-requests: write` を加算する
- **concurrency** — `${{ github.workflow }}-${{ github.ref }}` / `cancel-in-progress: true`。同一 PR への連続 push で古い実行を積まない。**配信系だけは例外**で、group に共有リソース名（`pages`）を置き `cancel-in-progress: false` とする（[0153](../../docs/adr/0153-ci-configuration.md) §3）。配信先は ref ごとに存在せず 1 つしかなく、走行中の deploy を切ると公開中のサイトが途中まで転送された成果物を配る。**保護ブランチの検査を積むために `false` へ倒すのも禁じる** — 古い木の結果が新しい木の結果を追い越して報告される。打ち切られた実行を失敗と読まないのは、条件式側（`!cancelled()`）の責任である
- **harden-runner** — 全 job 冒頭で egress を `audit` で記録する
- **絵を動かしうる検査は撮り直しへ登録する** — 落ちたときに story の見た目が変わりうる job を足したら、[`baseline-retake.yaml`](baseline-retake.yaml) の `DECIDES_PIXELS` へその job 名を加える。**job を改名するときは新旧の両方を置く** — この配列を読むのは `workflow_run` で起動する撮り直し側であり、そこで使われるのは既定ブランチの定義である（上記）。改名した PR が既定ブランチへ入るまで、照合されるのは旧名のままになる。旧名は既定ブランチが追いついてから外す。該当する check run が無い名前は、単に一致しないだけで害を持たない。**書き漏らすと、壊れた木から撮った絵が基準画像になる**（allowlist なので、登録されていないものは黙って無視される）。逆に、落ちても絵が変わらない検査は入れない — 撮り直しが止まるだけで、止まった理由は撮り直しの側からは説明できない
- **版数の SSOT は `mise.toml`** — Node / pnpm / actionlint / shellcheck / zizmor の版はワークフロー側に書かない。[`../actions/setup-mise`](../actions/setup-mise/action.yaml) が `mise.toml` から供給する（[0003](../../docs/adr/0003-version-manager.md)）。`matrix` は使わず `ubuntu-latest` 単一
- **例外は mise CLI 自身の版** — `mise.toml` は mise が解決する対象を宣言するもので、mise 自身の版を宣言できない。この 1 つだけは `setup-mise` の中に**版と SHA256 の対で**書かれている（[下記](#mise-の導入)）

## `paths:` フィルタを使わない

CI Checks のワークフローには `paths:` / `paths-ignore:` を付けない。

`paths:` で絞られたワークフローは、条件に合わない PR では**実行されず、status context も報告しない**。required check に指定した context が報告されないと、GitHub はその PR を「必須チェック待ち」のまま永久にブロックする。埋めるには、同名 job を即成功させる guard ワークフロー（`paths-ignore` に本体の `paths` を裏返しで書いたもの）を対で置くことになる。

本リポの CI Checks はどれも数分で終わり、実行コストよりも「本体と guard の 2 ファイルを常に裏返しの関係に保つ」保守コストのほうが高い。よってフィルタを付けず、全 PR で全 job を走らせる。

将来 `paths:` で絞りたくなるほど重い job（e2e 等）を足す場合は、**guard を対で用意するか、required check から外すか**のどちらかを必ず選ぶこと。片方だけを入れると即座にマージ不能になる。

**第 3 の道が [`../actions/diff-scope`](../actions/diff-scope/action.yaml)。** job は必ず起動して context を報告し、重いステップだけを `if:` で落とす。job 名が変わらないので required check も guard も触らずに済み、無関係な PR で消えるのは checkout と判定の数十秒だけになる。`bundle-budget` / `vrt` / `a11y` が使っている。

渡すのは「**自分に影響しえないもの**」の一覧であって、影響するものの一覧ではない。書き漏らしは無駄な 1 回で済むが、書き間違いは job が黙って何も検査しなくなる方向へ倒れる。**検査しない gate は「違反なし」と見分けが付かない**。判定の実装はこの action を共有し、job ごとに書き起こさないこと — 3 本に割れた判定は必ずずれ、ずれは黙って進む。

**一覧そのものは共有しない。**呼び出し側が書いた一覧だけが効き、action は既定値を持たない。`bundle-budget` が `*.css` / `tokens/*` / `.storybook/*` / `*.stories.tsx` / `*.test.ts` を外せるのは測るのが `.js` の量だけだからで、同じ行を `vrt` / `a11y` へ持ち込めば絵が変わる PR で検査が止まる。既定値を置けば、呼び出し側が一度も書いていない行が gate を黙らせうる — 一覧は「この job には届かない」という **job ごとの主張**であって、共有できる事実ではない。

| job | 外している範囲 |
| --- | --- |
| `bundle-budget` | ドキュメントと AI エージェント設定 + 絵にしか効かないもの（CSS / token / story / テスト） |
| `vrt` / `a11y` | ドキュメントと AI エージェント設定だけ |

**一覧の実体は各 workflow の `ignore:` ブロックが正**（[`bundle-budget.yaml`](bundle-budget.yaml) / [`vrt.yaml`](vrt.yaml) / [`a11y.yaml`](a11y.yaml)）。この表はどの範囲を外しているかを示すだけで、パスを書き写さない — 書き写せば実体と黙ってずれる側が 1 つ増える。

`vrt` / `a11y` はこの門の内側にもう 1 つ、絵を決める入力のハッシュで比較だけを省く判定を持つ。2 層がそれぞれ何を落とすかは [`../../vrt/README.md`](../../vrt/README.md) の「絵が変わり得ないときは撮らない」にまとめてある。

`paths:` を持つのは `deploy-docs` だけで、これは**後者（required check から外す）を選んでいる** — 走るのは自分自身を編集する PR だけなので、絞りを外すと全 PR で Pages 用のサイトを組み立てることになる。

`component-classes` / `shadcn-drift` は絞りを外して全 PR で走らせている。どちらも `pnpm install` とスクリプト 1 本で、`diff-scope` を噛ませていないのは、あの action が受け取るのが「**自分に影響しえないもの**」の一覧であるため — この 2 本が持つ狭い allow-list を裏返すと、書き間違いが「何も検査しない gate」の側へ倒れる。

## PR コメント（検査ログ: upsert-pr-comment）

coverage 以外の各 job は検査結果を即 fail させず、いったん capture して [`../actions/upsert-pr-comment`](../actions/upsert-pr-comment/action.yaml) で PR コメントを upsert し、最後に fail-closed で落とす。

- コメントは HTML マーカー（`<!-- lint-result -->` 等）で同定し、**同一 PR では増やさず更新する**。マーカーは job ごとに一意
- 成功時もコメントを更新する。FAIL → PASS で直したときに古い FAIL コメントが残るのを避けるため
- **`diff-scope` で降りたときも更新する。**降りた job は緑を報告するので、投稿を `relevant` で落とすと、前の push が出した FAIL コメントが緑チェックの隣に残り続ける。赤くした変更を base と同一内容へ戻す直し方（履歴を書き換えないこのリポジトリでは、これが正）で必ず踏む経路である。降りたことを述べる本文を書いて upsert すること
- 投稿ステップは `continue-on-error: true`。fork からの PR はトークンが read-only で投稿できないが、それで検査の判定を落とさない
- **検査コマンドに `secrets.*` を `env:` で渡さない**。Actions のシークレットマスキングはランナーがログ表示用に捕捉する経路にしか効かず、`tee` でファイルへ落とした内容は素通りする。そのファイルがこのリポジトリ（public）の PR コメントへそのまま載る。`GITHUB_TOKEN` だけが例外（投稿そのものに要る短命トークン）。この規約は `make actions-comment-secret-lint` が機械検査するが、追えるのは `${{ }}` 式の直接参照までで、`needs.<job>.outputs` 経由の間接渡しは検査を通る — **規約が正であり、検査は退行ガード**
- **既存コメントの同定は「bot 投稿者」と「マーカーで始まること」の両方を要求する**。public リポジトリでは第三者がマーカー入りのコメントを先に投稿でき、かつ全ワークフローが同じ bot で投稿するため、どちらか片方では同定にならない（別ワークフローのマーカーを検査ログへ出力させれば、そのワークフローを誤ったコメントへ誘導できる）。この前提として `github-token` には **bot として投稿するトークンを渡す** — 個人の PAT では投稿できても二度と更新できない
- **本文の折り畳みに使うフェンスは本文から決める**。検査ログには linter やコンパイラがソース行をそのまま出力するので、その中身は PR 提出者が制御できる。固定の 3 連バッククォートで囲むと本文自身がフェンスを閉じ、以降が生 Markdown としてレンダリングされる（mention による第三者への通知、偽の見出しやリンクが CI bot の名義で載る）。呼び出し側は自前でフェンスを組み立てず `details-summary` を使うこと（撤回条件 W12）
- **`title` と `details-summary` には静的リテラルだけを渡す**。無害化が効くのは本文（`body-file`）だけで、`title` は生 Markdown、`details-summary` は生 HTML としてフェンスの**外**に置かれる。ログの中身を要約して `title` に載せるような変更を入れると、フェンスで塞いだ注入が外側から復活する

カバレッジだけは、行単位の coverage と基準ブランチとの差分を構造化して報告する必要があるため、`test.yaml` の octocov が専用コメントを投稿する。ほかの検査ログ（セキュリティスキャン結果 / 生成物 drift を含む）はこの composite action に乗せる。

## 不採用の判断

| 候補 | 判断 | 理由 |
| --- | --- | --- |
| `sync-versions-check` | 不採用 | `mise.toml` の版数を複製する下流が本リポに存在しない（Dockerfile 無し / CI は `setup-mise` が `mise.toml` を直読み）。検査対象そのものが無い。`package.json` の `engines` / `packageManager` 等、版数の第二宣言を置いた時点で採用する |
| `auto-generate-docs` | 不採用 | portal の生成物（`guides/` / `docs.json`）は追跡せず配信時に組み立てるため、drift が発生しえない。追跡する生成物を持つのは型生成（[0072](../../docs/adr/0072-api-type-generation.md)）が入る時点で、そこで再検討する |
