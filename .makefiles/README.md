# Make コマンド一覧

## 役割

`.makefiles/` は本リポジトリで使用するすべての `make` ターゲットの中央レジストリです。各 `.mk` ファイルは関連
ターゲットを領域別にグルーピングし、トップレベルの `Makefile` はそれらを `include` するだけなので、既存領域への
ターゲット追加はトップレベル編集なしで完結します。

ターゲットは以下の単位で整理されています。

- `.makefiles/github` : GitHub 初期設定 / リリース / ラベル / ルール設定 / ワークフロー Lint / 基準画像の置き場
- `.makefiles/tools` : 開発ツールの管理（mise）/ コミットメッセージ検証 / 供給網の固定（Actions の SHA ピン・
  container image の digest ピン・runner の外向き通信）/ API 契約の取り込み
- `.makefiles/security` : シークレット / 依存脆弱性 / 自分が書いたコード（SAST・データフロー）/ 配信面（DAST）の
  スキャンと、抑止や pin の冷却期間の棚卸し
- `.makefiles/testing` : テストの高速実行とカバレッジ付き完全実行 / 分割実行 / 負荷帯によるゲートの委譲 /
  story と画面の撮影・比較 / Core Web Vitals / 落ちた画像の見直し
- `.makefiles/agents` : エージェントが呼ぶときの静音実行と、開発の窓の観測

アプリケーション側のコマンド（`dev` / `build` / `lint` / `typecheck`）は make ターゲットでは**なく**、
`package.json` の scripts に置き pnpm から実行します（[ADR 0001](../docs/adr/0001-package-manager.md)）。テストだけは
hook / CI の二層実行を明示するため `make` が入口となり、内部で pnpm script を呼びます。

## 規約

- ターゲット名はハイフン区切りの小文字（`make install-tools`、`make setup-repo`）
- すべて `.PHONY` 指定し、末尾 `## <説明>` コメントを付けて `make help` の一覧に載せること。説明コメントの無い
  `.PHONY` 行は `make help` が警告する（一覧に出ないターゲットは利用者から見えないため）
- 自明でないロジックはインラインシェルではなく `scripts/*.ts` に置き `pnpm exec tsx` から実行する。TypeScript に
  置けば `pnpm typecheck` と biome の検査対象に入り、実行環境ごとのシェル差異も持ち込まずに済む
- **外から来る値を make の変数として recipe 行へ展開しない。**`$(VAR)` はシェルへ渡る前にテキスト置換されるので、
  `"` や `;` を含む値でクォートが破れ、任意のコマンドが走る。ブランチ名は `git check-ref-format` が両方の文字を
  許すため、これは想定上の入力ではなく実在する入力である。`export <NAME>` で環境変数として渡し、受け取る側が
  `process.env` から読む形にすれば、値はシェルの構文解析を一度も通らない。**この規約を機械検査するものは無い**
  —— `make actions-shellcheck` が見るのは composite action の `run:` で、`make shellcheck` が見るのは追跡下の
  `*.sh` であり、どちらも `.mk` の recipe を読まない
- **シェル変数を全角文字の直前に裸で置かない。**`echo "…（配信元: $$BRANCH）"` と書くと、シェルが全角文字の
  先頭バイト（`0xEF`）を変数名の一部として食い、空へ展開したうえで壊れたバイト列を出す。`$${BRANCH}` と
  囲む。recipe の説明文は日本語なので、変数を差し込む位置はたいてい全角文字の隣になる。**壊れるのは表示
  だけで終了コードは変わらない**ため、検査でも人の目でも素通りしやすい
- 一回限りのリポジトリ運用コマンド（`make setup-repo` とその補助）は `.makefiles/github/operation/` 配下に置き、
  開発者向けターゲットと分離する。GitHub 設定を**適用する**ターゲットは `setting/`、何も変更せずファイルを
  **検査する**ターゲットは `lint/` へ置く
- **GitHub 設定の宣言は `.github/settings/*.json` に置き、`setting/` のターゲットはそれを API へ渡すだけにする。**
  1 つの payload に収まらず複数のエンドポイントへ分かれる設定（Pages の配信設定）だけが値を `.mk` に直接持ち、
  その理由をコメントに書く。いずれも現状を読んでから書き、適用済みのリポジトリで再実行しても何も変えない
- **利用者が渡す真偽の切り替えは `$(filter 1,$(VAR))` で判定する。**`$(if $(VAR),…)` は空文字列判定なので、
  `DRY_RUN=0` を「有効」と読む。有効値を `1` だけに揃えてあるのはこのため
- **`$(shell …)` を変数の定義に置かない。**トップレベルの `Makefile` は全 `.mk` を `include` するため、
  即時展開の `$(shell …)` はどのターゲットを叩いても走る。外部への問い合わせ（負荷帯の解決、docker の
  bridge の取得）は recipe の中で行う。`?=` で定義した `$(shell …)` は参照時まで遅延するので、`id -u` の
  ように軽く副作用の無いものに限って許す
- **各 `.mk` は自分が読む変数を自分で宣言する（`?=` と `export`）。**同じ名前を隣のファイルも宣言していても
  省かない。他ファイルの宣言に暗黙依存すると、`include` の順序を変えただけで静かに空になる。別ファイルの
  値を意図して既定にするとき（冷却期間が Actions の検疫日数を読む）は、その旨と理由をコメントに書く
- **順序が要る手順は prerequisite に並べず recipe の中で繋ぐ。**prerequisite は `-j` 付きの呼び出しで順序を
  持たない。`$(MAKE) a` → `$(MAKE) b` と recipe で順に呼ぶ（撮り直して送る）か、recipe の本文に置く（撮る
  直前に区画を空にする）。プロセスを起動して片付けるまでも 1 つの recipe に閉じ、`trap … EXIT INT TERM` で
  片付ける —— 生死を跨いだ状態を依存関係で表そうとすると、失敗した実行がサーバを残す
- **派生ターゲットは recipe を写さず、target-specific variable で差し替える。**`e2e-maintenance: E2E_PRECHECK := true`
  のように、共通の recipe（起動・待ち受け・片付け）は 1 つだけ持ち、変えたい環境・当てる設定・前提検査を
  変数で上書きする。同じ立て付けを 2 組持つと、片方だけを直した状態が生まれる
- **終了コードが成否を表さないツールは、生成物を見て判定する。**`storybook build` は preview の build が
  非同期で失敗しても 0 を返し、その木を下流へ渡すと story の全数が `iframe.html` を待って上限まで待つため、
  build の失敗が全数のタイムアウトとして現れる。build を包むターゲットは、生成物の存在
  （`storybook-static/iframe.html` / `.next/server/app`）を確かめてから成功を返す
- **検査ツール（lint / scanner）を直接呼ぶ recipe は、先頭で `command -v <tool>` を確かめ、無ければ
  `make install-tools` を案内して exit 1 にする。**「無ければ落ちる」側に振るのは、黙って飛ばすと検査範囲が
  縮んだまま緑になるため（actionlint は shellcheck が無いとシェル検査を黙って飛ばすので、`actions-shellcheck` /
  `shellcheck` は自分で落とす）。走査対象のディレクトリが無いだけなら 🟡 を出してスキップしてよい
- **`$(if …)` / `$(call …)` の引数にカンマを直に書かない。**引数の区切りと同じ文字なのでそこで切られる。
  `COMMA := ,` を定義して `$(COMMA)` で差し込む（`--reporter=list$(COMMA)blob`）
- **静音実行のパターンルールは接頭辞 `ai-%` であり、他のターゲット名を `ai-` で始めない。**`%-ai` のような
  接尾辞にすると、基底が既にパターンルールのターゲットのとき一致先が二つに割れ、外れたほうは失敗せず黙って
  別のことをする。`ai-%` なら他のパターンのリテラル接頭辞と一致しない
- **サーバを立てるターゲットは自分の既定ポートを持ち、他と重ねない。**開発サーバ（3000）/ Storybook（6006）と
  も互いとも別にし、起動前に空いていることを確かめる。同じポートを使うと、既に何かが待ち受けている環境で
  「起動を待つ」が他人のサーバへの疎通で満たされ、その相手に対してテストが走る。CI が同じ機械で複数の
  起動を続けて回すときも、段ごとに別のポートを渡す
- **コンテナで走らせるターゲットは `RUNNER_UID` / `RUNNER_GID` を `id -u` / `id -g` で渡す。**生成物をホストの
  所有者で書き出すためで、compose 側の既定（1000）は Linux の初回ユーザであって、実行者と一致する保証が無い
- **`.gitignore` を読まないスキャナには、走査から外す場所を明示する。**`node_modules`（lockfile と同じ依存の
  二重計上）と `.claude/worktrees`（別ブランチの実体）は ignore 済みでも指定しないと走査される
- **報告専用の走査とゲートは別ターゲットにする。**報告専用は exit code で落とさず、CI だけが
  `<TOOL>_DETECT_EXIT=1` を渡して検出の有無を受け取る —— 「走らなかった」と「見つかった」が同じ緑になると
  コメントの要否を決められない。これは報告専用をゲートへ変える設定ではなく、ジョブを落とすかは呼び出し側が
  決める。ゲートは昇格（保護ブランチ宛 PR）の一点に置く（[ADR 0110](../docs/adr/0110-security-operations.md)）
- **同じ検査を別の形式で書き出すターゲットは、検査条件を 1 箇所に持つ。**フラグを変数に括り出して両方が
  読む（`OPENGREP_FLAGS`）か、元のターゲットを `$(MAKE) <target> <ARGS>="…"` で呼び直す（`bearer-sarif`）。
  ゲートと Security タブの一覧が別の走査を指すと、どちらも信用できなくなる
- **自分を消すターゲットはマーカー（`# sample:begin` / `# boilerplate-only:begin` と対応する `end`）で囲む。**
  make は起動時に makefile を全読込するため、recipe の中のスクリプトがこの `.mk` から自分のターゲットを消しても
  実行中の recipe は続く。後段の整形・検査は `&&` で連鎖させ、途中の失敗が完了メッセージに隠れないようにする

## ターゲットの一覧表示

```bash
make help
```

`make help` は `.makefiles/` 配下の `.PHONY: <target> ## <説明>` 行を収集し、各ファイルの `## <カテゴリ>` 見出し
ごとにグルーピングして出力します。

## `.makefiles/github` 系

### GitHub 設定関連

| コマンド | 説明 | 補足 |
| --- | --- | --- |
| `make gh-login` | `gh` コマンドで GitHub にログインします。 | ブラウザ認証方式でログインを行います。 |
| `make labels-delete-all` | GitHub リポジトリ上の既存ラベルをすべて削除します。 | なし |
| `make labels-create-default` | `.github/settings/labels.json` をもとに、デフォルトラベルを作成します。 | 宣言の読み取りと、宣言と実在の差分は [`scripts/github-settings/labels.ts`](../scripts/github-settings/labels.ts) が持ちます。名前が実在するラベルは色や説明が宣言と違っても触りません。 |
| `make branch-protection-apply` | `.github/settings/` のルールセット（`branch-protection.json` / `work-branch-history.json`）を、対象リポジトリへ順に POST します。 | 1 件でも API が拒めば応答を全文出して止まります。`gh` の版が古くて API と噛み合わないときも同じ形で現れます。 |
| `make pages-delivery-apply [PAGES_DELIVERY_BRANCH=<branch>]` | GitHub Pages を Actions 配信にし、`github-pages` environment へ配信元ブランチを許可します。 | 既定の配信元は `production` で、[`deploy-docs.yaml`](../.github/workflows/deploy-docs.yaml) の push トリガと揃える必要があります。3 段とも現状を読んでから書くため、適用済みのリポジトリで実行しても何も変えません。environment への PUT を「まだ名指し方式でないとき」に限るのは、この PUT が body に無い項目（レビュアー・待ち時間）を消すためです。**許可が無いと `docs-deploy` は step を 1 つも実行せずに落ちます**（job 自体は起動するので、失敗の理由がログに出ません）。 |

### GitHub リポジトリ初期化関連

#### `make setup-repo`

複製直後のリポジトリ初期化処理をまとめて実行します。以下を順に行います。破壊的な手順を含むため、
作った直後以外で実行する前に必ず内容を確認してください。タグ `v0.0.0` が既に在れば初期化済みとみなし、
何もせず止まります。

- `gh` ログイン
- **既存タグの全削除**（ローカルと `origin` の両方）と初期タグ `v0.0.0` の作成 / push
- `develop` / `staging` / `production` ブランチの作成（既に在るものは飛ばす）
- GitHub デフォルトブランチの設定と `production` への切り替え。実行時に居たブランチが `release/` なら、
  そのブランチをローカルと `origin` から削除
- ブランチルールセット適用
- Pages の配信設定（Actions 配信への切り替えと、`production` からの配信許可）
- ラベル初期化
- **`.github/release/` 配下のリリースノートを `v0.0.0.md` を除いて全削除**
- **`upstream` リモートの削除**

#### セットアップ補助コマンド

| コマンド | 説明 | 補足 |
| --- | --- | --- |
| `make setup-replace-license-copyright COPYRIGHT_HOLDER=<name> [COPYRIGHT_YEAR=<year>]` | LICENSE の著作権表記を更新します。 | 年は省略可能です。 |
| `make setup-replace-repository-reference REPOSITORY=<owner>/<repo> [PORTAL_URL=<url>]` | GitHub リポジトリ参照とプロジェクト名（`package.json` の `name`）、およびドキュメントポータルへのリンクを、新しいリポジトリのものへ置換します。 | `PORTAL_URL` を省くと GitHub Pages の配信先（`https://<owner>.github.io/<repo>/`）を組み立てます。custom domain のときだけ渡します。`docs/` / `.claude/` / `scripts/setup/` / ビルド成果物（`.next` / `dist` / `build` / `tmp`）/ ロックファイルは対象外です。 |
| `make setup-remove-licensed-scanners` | 資格情報を要するスキャナ（CodeQL / SonarQube Cloud / Dependency Review）を 3 つまとめて撤去します。 | **製品ごとに別のコミットへ分けます。**1 つだけ残したくなったらそのコミットを `git revert` します。作業ツリーはクリーンである必要があります。workflow・pin・宛先の宣言に加えて、**宣言した文書の行も落とします** —— 宣言が現物と一致することはテストが見るので、行が動いていれば撤去は投げて止まります。撤去は選択なので、決めるまでの間に壊れるものはありません（どれも未設定なら自分を飛ばして緑を返します）。 |
| `make setup-remove-boilerplate-only` | boilerplate 限定の記述（配る側にしか意味を持たない規則・注記）を剥がします。 | 剥がし終えると道具自身も消えます。飛ばす選択肢はありません（[0152](../docs/adr/0152-agents-md-policy.md)）。 <!-- boilerplate-only:line --> |
| `make setup-remove-sample` | 題材を持つ画面一式を破棄し、検証まで実行します。 | **破壊的です。** 残す側にサンプル固有の語彙を持ち込まないための出口で、削除後にゲートが通ることまで確かめます。 |

いずれの補助コマンドも `DRY_RUN=1` を付けると、書き換えずに変更予定だけを出力します。有効値は `1` のみで、
それ以外（`DRY_RUN=0` や変数の省略）はすべて実際に書き換えます。

### VRT 基準画像の置き場関連

基準画像は別リポジトリに置き、`baseline/images` からサブモジュールとして参照します
（[`vrt/README.md`](../vrt/README.md)）。置き場側は workflow を持たないので、操作はすべてここから出ます。

| コマンド | 説明 | 補足 |
| --- | --- | --- |
| `make setup-baseline-store` | 置き場を用意し、`baseline/images` へ配線します。 | 既存リポジトリの指定を先に問います（組織では新規作成が権限で縛られていることがあるため）。新規作成時は README を置く初期コミットまで作ります。配線済みなら張り替えるので、組織の移動やリポジトリ名の変更でも同じコマンドで済みます。 |
| `make setup-baseline-app` | 撮り直しに使う GitHub App を `BASELINE_APP_ID` / `BASELINE_APP_PRIVATE_KEY` へ登録します。 | App の作成と鍵の生成は自動化できません。App ID は slug から解決するので控える必要はなく、秘密鍵は標準入力へ貼るのでディスクにも履歴にも残りません。 |
| `make baseline-prune [DRY_RUN=1]` | 生きた ref から指されていない基準画像の一式を置き場から消します。 | 取り消せません。実行を促すのは月次の [`baseline-prune.yaml`](../.github/workflows/baseline-prune.yaml) で、閾値を超えたときだけ issue を立てます。保持の条件は [`scripts/baseline-store/retention.ts`](../scripts/baseline-store/retention.ts)。 |

### GitHub Actions Lint 関連

| コマンド | 説明 | 補足 |
| --- | --- | --- |
| `make actionlint` | `.github/workflows` のワークフロー定義を actionlint で検査します。 | ディレクトリが存在しない場合はスキップします。 |
| `make actions-shellcheck` | composite action（`.github/actions/**/action.yaml`）の `run:` シェルを shellcheck で検査します。 | 指摘は `action.yaml` の行・列で報告します。`bash` / `sh` 以外の `shell:` は検査せず、位置と方言を添えて skip として出力します。 |
| `make actions-mise-pin-lint` | `setup-mise` の版 / digest / キャッシュキーが揃っているか検査します。 | mise 自身の版は `mise.toml` に書けないため composite action が宣言を持ち、`with:` から `env:` を参照できない制約でキャッシュキーが同じ値を二度目に持ちます。片方だけ直した状態は落ちますが原因が遠いので検査します。整合違反は exit 1、検査が成立していない状態は exit 2。 |
| `make actions-comment-secret-lint` | PR コメントを投稿するジョブに `GITHUB_TOKEN` 以外の secret が渡っていないか検査します。 | 規約違反は exit 1、検査そのものが成立していない状態は exit 2 で区別します。 |
| `make actions-required-check-lint` | required status check に登録した context が、すべての PR で報告されるか検査します。 | 判定に要るのが ruleset の宣言とワークフロー定義の 2 ファイルなので actionlint では表現できません。宣言違反は exit 1、検査が成立していない状態は exit 2 で区別します。 |
| `make actions-zizmor` | workflows と composite action の定義を zizmor で静的解析します。 | actionlint / `actions-shellcheck` が shellcheck へ渡す前に `${{ … }}` を潰すため見えない観点（`run:` での未クオートな式展開など）を担います。落とすのは high の所見だけで、抑止は `.github/zizmor.yml` に理由付きで宣言します。**全所見を出す実行と high だけで落とす実行の 2 段で走ります** —— `--min-severity` は表示も絞るので、1 段だと severity の引き下げで抑止した所見が出力からも消え「黙って素通り」になるためです。設定ファイルは自動探索に任せず明示します（外れても「所見ゼロ」ではなく「抑止が効かない」形で現れ、気付けないため）。hook / CI とも `--offline` で走ります。 |
| `make issue-field-lint` | 実装タスクの issue が、テンプレートの必須項目を実際に持っているかを見ます。 | フォームで立てた issue と `--body-file` で立てた issue は同じ項目を負うのに、後者だけ無検査になるためです。 |
| `make shellcheck` | 追跡下の `*.sh` を shellcheck で検査します。 | 対象は「依存の導入前に走る必要があってシェルで書くしかないもの」（ADR 0155 の例外）です。TypeScript ではないので 1:1 ゲートもカバレッジも掛からず、`.github` の外なので actionlint も届きません。shellcheck が無ければ検査範囲が黙って縮むため落とします。 |

actionlint は `run:` ステップのシェルも shellcheck 経由で検査するため、両バイナリを `mise.toml` で版固定して
います（[ADR 0003](../docs/adr/0003-version-manager.md)）。先に `make install-tools` を実行してください。

composite action は actionlint の走査対象に含めていません（`action.yaml` を渡すと workflow として解釈され、
必ず構文エラーになります）。その代わり `run:` のシェルは `make actions-shellcheck` が担い、両者を合わせて
pre-commit hook と CI の `actions-lint` job が実行します。actionlint 側に何が残るかは
[ADR 0153](../docs/adr/0153-ci-configuration.md) を参照してください。

`make actions-shellcheck` は、次のいずれかでも異常終了します。検査範囲が黙って縮んだまま緑になる状態を
作らないためのもので、判定はファイル単位です（合計で見ると 1 ファイルの抽出失敗が他ファイルの成功に隠れます）。

- **抽出数が合わない** — パーサ自身の変換で数えた `runs.steps[].run` の件数と、実際に抽出できた件数が食い違う
  （`using:` の綴りを取り違えた action もここで落ちます）
- `runs.using: composite` なのに `runs.steps` がリストとして読めない
- `run:` ステップに `shell:` が無い / 参照先の無い alias がある / YAML として壊れている

`run:` の本文は**リテラル（`|`）で書いてください**。ブロック折り畳み（`>`）は隣接する行を空白へ畳むため
指摘の位置を写し戻せず、畳まれた行がソースに無い構文を作って誤検知も生むため、error になります。

`make actions-comment-secret-lint` は、検査ログをそのまま公開 PR コメントへ複製する `upsert-pr-comment` の
性質上守らなければならない規約 — **本文を作るジョブに secret を渡さない**（[ADR 0153](../docs/adr/0153-ci-configuration.md)）—
を機械検査します。走査単位はステップではなく**ジョブ**で、`upsert-pr-comment` を内側で呼ぶローカル action を
経由するジョブも対象に含めます。

参照を探す対象はソースの範囲ではなく**パース済みスカラーの値**です。範囲で切ると、YAML コメントに書いた
例示が実参照として拾われ、閉じない `${{` があればそこから次の `}}` までが 1 つの式と見なされて間にある
本物の参照を呑み込み、alias で他のジョブへ退避させた値は逆に対象から外れます。

検出できるのは `${{ }}` 式に現れる secrets コンテキストの直接参照だけです。別ジョブで読んで
`needs.<job>.outputs` 経由で渡す間接参照は静的に追えないため検査を通ります。**規約が正であり、この検査は
規約が将来 `env:` 1 行で破られることへの退行ガード**です。

異常終了は 2 通りに分かれます。

- **exit 1** — 規約違反（投稿ジョブ、またはワークフロー全体に及ぶ位置に `GITHUB_TOKEN` 以外の secret がある）
- **exit 2** — 検査そのものが成立していない。ワークフローが 1 件も見つからない（リポジトリルート以外での実行）/
  `jobs:` がマッピングとして読めない / `upsert-pr-comment` の定義があるのに、それを使うジョブが 1 つも
  見つからない（参照の同定が壊れている）/ ジョブが reusable workflow を呼び出している（呼び出し先へ
  `with:` で渡る secret を追えないため未対応）

`make actions-required-check-lint` は、[`../.github/settings/branch-protection.json`](../.github/settings/branch-protection.json)
が必須にしている context ごとに、**その名前を報告し続ける job がちょうど 1 つあること**を検査します。報告
されない context は「必須チェック待ち」のまま永久にマージできず、壊れたと分かるのは原因を入れた PR では
なく次に上がってきた PR です。

落とすのは次の 6 つ。いずれも登録した時点では緑に見え、条件を満たさない PR が来た瞬間にマージ不能へ変わ
ります。

- その名前を宣言する job が無い（job の rename が典型）
- 複数の job が同じ名前を宣言している（どちらの結果を必須にしているのか決まらない）
- その workflow が `pull_request` で走らない
- `pull_request` が `paths` / `paths-ignore` / `branches` / `branches-ignore` で絞られている
- `types:` を絞っていて `opened` / `synchronize` を含まない
- context 名が実行時に枝分かれする（`strategy.matrix` / reusable workflow の呼び出し）

`if:` で降りる job は落としません。降りた job は `skipped` を報告し、必須チェックはそれを成功として数える
ため、報告そのものは途切れないからです。

ワークフローの列挙と `jobs:` へ降りるまでの読み取りは [`../scripts/lib/workflow-files.ts`](../scripts/lib/workflow-files.ts)
が持ちます。**同じ判断を検査ごとに書き起こすと、片方だけが直った状態が黙って生まれる**ため、
`make actions-comment-secret-lint` と共有します。

### ベースブランチの解決関連

フィーチャーブランチの分岐元と、PR が無いときの base を答えます。判断は
[`scripts/base-branch/resolve.ts`](../scripts/base-branch/resolve.ts) が持ち、出所を `origin` の実状態に
限る理由は [`scripts/base-branch/README.md`](../scripts/base-branch/README.md) が持ちます。

この 2 つだけは pnpm の依存検査を外して起動します（`pnpm --config.verify-deps-before-run=false`）。分岐元は
`node_modules` を入れる前に要り、引くのが node 組み込みとリポジトリ内のモジュールだけなので依存の新旧が
答えを変えないためです。**外してよい理由は「node_modules から何も引かない」ことだけ**で、依存を 1 つ引いた
時点で崩れますが答えは返り続けるため、import と recipe の宣言の両方を
[`scripts/verify-deps-bypass.gate.test.ts`](../scripts/verify-deps-bypass.gate.test.ts) が見ます。同じ性質の
ターゲットを増やすときは、この検査の入口一覧へ足します。

| コマンド | 説明 | 補足 |
| --- | --- | --- |
| `make base-branch` | 最新のリリースライン（`release/vX.Y.Z`）のブランチ名を 1 行で出力します。 | `git ls-remote` で `origin` の実状態を読むため、`git fetch` では更新されないローカルの `refs/remotes/origin/HEAD` が古くても、GitHub のデフォルトブランチが前のラインを指したままでも答えは変わりません。「最新」はコミット日時ではなく版の数値比較で、リリースブランチを切る側と同じ判定を使います。出力は装飾を持たないので `$(make -s base-branch)` でそのまま受けられます。リリースラインが 1 本も無ければ exit 1 で、空文字を返しません。PR が既にあるならその `baseRefName` が正で、これは PR が無いときの答えです。 |
| `make base-merge [BASE=<ref>] [DRY_RUN=1]` | ベースブランチを現在のブランチへ取り込み、未解決のパスを 1 行 1 件で出力します。 | ベースは `--base` → PR の `baseRefName` → 最新のリリースライン の順で最初に決まったものを採ります。PR がある枝でそのベース以外を取り込むと、追いつかせるつもりが行き先の付け替えになります。**rebase はしません**（[0150](../docs/adr/0150-git-workflow.md)。加えて追記専用のファイルでは同じ内容が別のハッシュで再着地します）。保護ブランチの上と作業ツリーが汚れている状態は拒みます。衝突が残ると exit 1 で、**作業ツリーは MERGING のまま残します** —— 解決は `resolve-merge` が続けるので、ここで捨てるとその入力ごと失われます。分類と解決は持ちません（[`scripts/base-merge/README.md`](../scripts/base-merge/README.md)）。 |

### リリースブランチ関連

いずれも取り消せない操作（`origin` への push / デフォルトブランチの張り替え）を含みます。何をどの順で
実行するかの判断は [`scripts/release/branch.ts`](../scripts/release/branch.ts) が持ち、ターゲットは
入口を呼ぶだけです。

| コマンド | 説明 | 補足 |
| --- | --- | --- |
| `make hotfix-patch` | `production` から hotfix ブランチを作成し、GitHub のデフォルトブランチに設定します。 | 現在の最新タグを基準に patch を 1 つ進めます。同名ブランチが既に在るとき、作業ツリーが汚れているときは何もせず終了します。 |
| `make branch-patch` | `production` から patch リリース用ブランチを作成し、デフォルトブランチに設定します。 | 現在の最新タグを基準に patch バージョンを進めます。 |
| `make branch-minor` | `production` から minor リリース用ブランチを作成し、デフォルトブランチに設定します。 | 現在の最新タグを基準に minor バージョンを進めます。 |
| `make branch-major` | `production` から major リリース用ブランチを作成し、デフォルトブランチに設定します。 | 現在の最新タグを基準に major バージョンを進めます。 |

### 版の焼き込み関連

版の出所はリリースブランチ名（= タグから数えた次の版）1 つで、`package.json` はそこから導かれる側に
置きます。焼き込みはブランチを切る手順（上記）の中で走るため、通常これらを直に叩くことはありません。
何を書くか・何を落とすかの判断は [`scripts/package-version/version.ts`](../scripts/package-version/version.ts)
が持ちます。

`REF` は recipe 行へ展開せず、環境変数 `PACKAGE_VERSION_REF` としてスクリプトへ渡します（理由は上記
「規約」）。`REF` 省略時の取り回し（`GITHUB_REF_NAME` → 手元の現在ブランチ）はスクリプトが持ちます。

| コマンド | 説明 | 補足 |
| --- | --- | --- |
| `make version-stamp [REF=<ref>]` | `package.json` の `version` をブランチ名の版へ書き換えます。 | `release/vX.Y.Z` / `hotfix/vX.Y.Z` 以外の ref では何もせず正常終了します。コミットはしません。 |
| `make version-stamp-commit [REF=<ref>]` | 同じ焼き込みを、**書き換えが起きたときだけ**コミットまで行います。 | リリースブランチを切る手順が使います。既に名乗りどおりのときにコミットへ進むと、ステージが空のまま `git commit` が落ち、手順が push の手前で止まります。 |
| `make version-stamp-check [REF=<ref>]` | `package.json` の `version` がブランチ名と一致するか検査します。 | 書き換えません。食い違いで落ちます（`package-version` job が pull request の base を渡して回します）。 |

### リリースタグ関連

判断は [`scripts/release/tag.ts`](../scripts/release/tag.ts) が持ちます。基準にする最新タグの選定は
[`scripts/semver/latest.ts`](../scripts/semver/latest.ts) が一箇所で担い、`pnpm exec tsx scripts/semver latest`
としても引けます。

| コマンド | 説明 | 補足 |
| --- | --- | --- |
| `make tag-patch` | patch バージョンを 1 つ進めたタグを作成し、GitHub Release を作成します。 | 現在の最新タグを基準とし、リリースノートには `.github/release/<version>.md` を使用します。ノートが無ければタグも Release も作りません。 |
| `make tag-minor` | minor バージョンを進めたタグを作成し、GitHub Release を作成します。 | 現在の最新タグを基準にします。 |
| `make tag-major` | major バージョンを進めたタグを作成し、GitHub Release を作成します。 | 現在の最新タグを基準にします。 |

## `.makefiles/tools` 系

### ツールバージョン管理関連

| コマンド | 説明 | 補足 |
| --- | --- | --- |
| `make install-tools` | [`mise.toml`](../mise.toml) の `[tools]` を一括でインストールします。 | mise の事前インストールが必要。何が入るかは `mise.toml` が正で、ここには写しません。全エントリが backend を明示します（[ADR 0003](../docs/adr/0003-version-manager.md)）。 |

### コミットメッセージ検証関連

| コマンド | 説明 | 補足 |
| --- | --- | --- |
| `make commitlint [COMMIT_MSG_FILE=<path>]` | コミットメッセージを commitlint で検証します。 | `.lefthook.yaml` の commit-msg hook から呼ばれます。`COMMIT_MSG_FILE` 省略時は編集中のコミットメッセージを対象にします。その実体は `.git/COMMIT_EDITMSG` と決め打ちせず `git rev-parse --git-path COMMIT_EDITMSG` で引きます —— worktree では `.git` がファイルで、実体は本体側にあるためです。規約は [ADR 0150](../docs/adr/0150-git-workflow.md) 参照 |

### API 契約の取り込み関連

契約は上流のリポジトリが正本で、こちらは取得して生成するだけです（[ADR 0072](../docs/adr/0072-api-type-generation.md)）。

| コマンド | 説明 | 補足 |
| --- | --- | --- |
| `make api-fetch [NAME=<name>]` | `openapi/sources.yaml` の座標から契約を取得し、blob SHA をスタンプします。 | `gh` の認証が要ります。`NAME` を省くと `sources.yaml` の全件を取得します。 |
| `make api-gen` | 取得済みの契約から型 / zod / MSW ハンドラを生成します。 | 生成の直後に整形まで掛けます。整形を別手順にすると生成しただけの状態が commit され、drift ゲートが「生成し忘れ」ではなく「整形し忘れ」で落ちます。 |
| `make api-gen-check` | 契約と生成物の版が揃っているか検証します（生成はしません）。 | CI / hook 用。 |

### GitHub Actions の SHA ピン関連

`uses:` を moving tag のまま置くと、上流が tag を付け替えた時点で CI が実行する内容が黙って変わります。
これを防ぐため、参照は commit SHA へ固定し、tag → SHA の対応を `.github/actions-pin.toml` が持ちます
（[ADR 0153](../docs/adr/0153-ci-configuration.md)）。**版の SSOT は `uses:` 行末尾のコメント tag** であり、
`@` 側の SHA ではありません。

| コマンド | 説明 | 補足 |
| --- | --- | --- |
| `make actions-pin-resolve [ACTIONS_PIN_MIN_AGE_DAYS=<days>] [ACTIONS_PIN_ALLOW_MOVED="<key>..."]` | コメント tag を `git ls-remote` で SHA へ解決し、ロックファイルを再生成します。 | 3 つのうち唯一ネットワークへ出ます。既定の検疫日数は 14。不変を宣言した tag の解決先が変わると exit 1（下記）。GitHub API のレート制限に掛かる場合は `GITHUB_TOKEN`（または `GH_TOKEN`）を設定してください。 |
| `make actions-pin-apply` | ロックファイルを元に `uses:` の `@<sha>` を書き換えます。 | コメント tag は保持します。 |
| `make actions-pin-check` | `uses:` がロックファイル通りに固定されているか検査します。 | 書き換えず、ネットワークにも出ません。pre-commit hook と CI の `actions-pin` job が実行します。未登録の参照 / 未固定・不一致の SHA / 壊れたロックファイル / 参照されなくなったエントリ / 解釈できない `uses:` 記法を検出して exit 1（fail-closed）。 |
| `make egress-apply` | `.github/egress.yaml` を workflow の harden-runner へ反映します。 | 許可した宛先以外への外向き通信は遮断されます（`egress-policy: block`）。**足す根拠は実測**（`audit` が記録した `domain resolved:` 行）に置いてください。記録が揃っていない workflow は宣言側で `audit` に留め、理由と外す条件を書きます。 |
| `make egress-check` | workflow が宣言どおり固定済みかを検査します。 | 書き換えず、ネットワークにも出ません。pre-commit hook と CI の `actions-lint` job が実行します。宣言との差分 / 想定外の記述 / 参照されなくなったエントリを検出して exit 1（fail-closed）。 |

`uses:` は **1 行 1 ステップのブロック記法**で書いてください。YAML の flow mapping
（`- {name: X, uses: owner/repo@v1}`）は検査の網に入らないため、素通りではなく error になります。

`ACTIONS_PIN_MIN_AGE_DAYS` は供給網検疫の窓です。解決先が公開から指定日数に満たない場合、既存のピンがあれば
それを維持し、無ければ採用を見送ります。公開直後の（侵害されている可能性のある）リリースを、上流が検知・
取り下げるより先に取り込まないための猶予です。`0` を渡すと検疫は無効になります。

検疫が見る経過日数は、Release の `published_at` と commit の日付のうち**新しい方**です。Release は tag 名に
紐づくだけで tag の付け替えでは動かず、commit の日付は発行者が任意に書けるため、どちらも単独では解決先の
新しさを表しません。ただし新しい方を採ってもなお、**検疫は自動化された乗っ取りに対して時間を稼ぐ仕組みで
あり、日付の偽装に耐える保証ではありません**。tag 付け替えそのものの検知は下記の fail-closed が担います。

#### tag 付け替えの検知

`make actions-pin-resolve` は、**不変を宣言した tag の解決先が変わった時点で exit 1 になり、ロックファイルを
書きません**（承認済みの移動や他のエントリを含め、一切書きません）。付け替えられた SHA が一度ロックファイルへ
入れば、以降 `make actions-pin-check` は「整合している」と答え続けるためです。

`# v6` のような **bare な major 番号だけを moving**（前進してよい）とみなします。`# v6.1.0` / `# v6.1` / `# main`
はすべて不変として扱われ、解決先が動けば落ちます。上流が `v6.1` のような moving minor tag を持つ場合は誤検知
しますが、その向きの誤りは停止で済みます。

意図した更新であれば、ロックファイルのキーを空白区切りで並べて承認します。

```bash
make actions-pin-resolve ACTIONS_PIN_ALLOW_MOVED="actions/cache@v6.1.0"
```

承認は 1 回の移動に対して与えるものです。移動していないキーを承認に残していると次の付け替えを黙って通すため、
その場合は「承認は不要でした」と表示されます。承認しても検疫は独立に掛かります。

検知の失敗出力は、キーを埋め込んだ承認コマンドを組み立てません。キーは 1 行ずつ上に並ぶので、承認する分だけを
自分で並べ直してください。

更新の運用手順は `actions-pin` スキルが持ちます。

> Rationale: [0153](../docs/adr/0153-ci-configuration.md)

### container image の digest ピン関連

registry の tag は、同じ名前のまま別の中身を指せます。`image:` / `FROM` / `uses: docker://` を tag の
ままにしておくと、指し先が差し替わったことに気づかないまま新しい中身を引きます。そこで参照は
digest へ固定し、`image:tag` → digest の対応を `docker/images-pin.toml` が持ちます。**版の SSOT は
tag 側**であり、digest ではありません。走査対象は `docker-compose*.{yml,yaml}`、
`docker/<用途>/Dockerfile`、そして `.github/workflows/**` / `.github/actions/**` の
`uses: docker://<image>:<tag>` です。

最後のものは `uses:` の行ですが参照先は registry なので、SHA ピンを担う actions-pin ではなくこちらが
固定します（actions-pin は tag を `git ls-remote` で commit へ解決する機構で、registry には効きません）。
両機構は同じファイルを走査しますが、掴む行は重なりません。

| コマンド | 説明 | 補足 |
| --- | --- | --- |
| `make images-pin-resolve [IMAGES_PIN_MIN_AGE_DAYS=<days>]` | tag を `docker buildx imagetools inspect` で digest へ解決し、ロックファイルを再生成します。 | 3 つのうち唯一ネットワークへ出ます（docker の認証情報を使います）。既定の検疫日数は 14。 |
| `make images-pin-apply` | ロックファイルを元に参照を `image:tag@sha256:...` へ書き換えます。 | tag と行末コメントは保持します。 |
| `make images-pin-check` | 参照がロックファイル通りに固定されているか検査します。 | 書き換えず、ネットワークにも出ません。pre-commit hook と CI の `images-pin` job が実行します。未登録 / 未固定・不一致 / 参照されなくなったエントリ / 解釈できない記法を検出して exit 1（fail-closed）。 |

参照は **1 行 1 件・引用符なし・tag 明示**で書いてください。`image: "alpine:3.24"` のような記法や、
tag を省いた `uses: docker://alpine`（＝`:latest`）は検査の網に入らないため、素通りではなく error に
なります。

`IMAGES_PIN_MIN_AGE_DAYS` は供給網検疫の窓で、経過日数は image config の `created` から見ます
（マルチアーキでは最も古いものを採ります）。既存のピンがあればそれを維持し、無ければ tag のまま
残さず失敗させます。tag だけの運用を許すと、未検証の digest をそのまま引くためです。

**tag の付け替えは検知しません。** base image の tag は patch 版が出るたび前進するのが通例で、
「解決先が変わったら止める」を入れると日常的な更新と区別が付かなくなります（Actions の SHA ピンとは
ここだけ運用が異なります）。image に対して働く防壁は検疫と固定の 2 つです。

## `.makefiles/testing` 系

| コマンド | 説明 | 補足 |
| --- | --- | --- |
| `make test-cached` | Vitest を cache 利用で実行します。 | pre-commit 用の高速フィードバック。coverage gate は実行しません。 |
| `make test-full` | Vitest を cache 無効・coverage 付きで実行します。 | pre-push / CI 用。Statements / Branches / Functions / Lines の各 100% を下回ると失敗します。人間向けの reporter は `dot` です —— **通過を捨てるのはテキストの濾過ではなく reporter の選択で行います**。失敗行を語彙で拾う形は失敗の理由そのものを通過行として捨てうるのに対し、`dot` は vitest 自身が通過を 1 文字へ畳む出口で、失敗の理由もカバレッジ表も残ります。これでログの大きさが通過件数に比例しなくなり、`tail -n 400` が全文を覆います。 |
| `make test-failures [TEST_RUN=<target>]` | テストを走らせ、**落ちたケースだけ**を出力します。通過したケースは 1 行も出ません。 | 読むのは vitest の JSON レポート（`status` / `failureMessages`）で、失敗行を語彙で拾う要約器ではありません（[0157](../docs/adr/0157-inspection-declaration-discipline.md)）。全通過なら 1 行、失敗ならその全件が件数つきで出ます。カバレッジの閾値割れは JSON に載らないため、テストが 0 件落ちているのに失敗しているときだけ末尾のログを添えます（分岐は構造化された値だけで決まり、ログの語彙は読みません）。`TEST_RUN` は走らせる先で、既定は `test-full`、CI の合流側は `test-merge`。報告の組み立ては 1 か所しか無く、終了コードは走らせた側のものをそのまま返します。**`tmp/test-report.json` を直接読まないこと** —— 通過したケースも全件書くので、実測で素のテキスト出力の 1,100 倍（690B に対して 785KB）あります。 |
| `make scripts-test-cached` | 補助スクリプト（`scripts/**`）の suite を cache 利用で実行します。 | pre-commit 用。export と describe の 1:1 ゲートを含みます。 |
| `make scripts-test` | 補助スクリプトの suite を cache 無効・coverage 付きで実行します。 | pre-push / CI（`scripts-check`）用。アプリ本体の suite と分けるのは、`scripts/` に居るのが検査機構そのもので、落ちた理由を取り違えないためです（[0090](../docs/adr/0090-testing-strategy.md)）。 |
| `make test-shard SHARD=<i>/<n>` | 分割の 1 台ぶんを走らせ、blob と自分の終了コードを書き出します。 | 割るのは PR の待ち時間のためだけで、保護ブランチと手元は `test-full` のままです（台数ぶん固定費が重複するので、誰も待っていない実行で払う理由が無い）。**各台は閾値を持ちません** —— 割った実行が見るのは自分に割り当てられたファイルだけで、他の台が覆う行は未到達として数えられます。判定は合流させた側が行います。blob の置き場は vitest 既定の `.vitest-reports` ではなく `tmp/` 配下です —— **ドットで始まる名前を upload-artifact の glob が拾わず**、台が書いても成果物が空で上がります。**終了コードとログの末尾も自分で書き出します**（blob とは別の区画へ）—— 合流側が読む JSON はケースの成否とカバレッジしか持たないので、台が失敗を 1 件も記録せずに非ゼロで終わると、その事実はどこにも残らず「全件通りました」と述べたまま検査だけが赤くなります。 |
| `make test-shards-verify` | 分割の結果が全台ぶん届いているかを確かめます（合流の前）。 | 足りないまま束ねると、走らなかったテストがカバレッジ不足として現れ、原因を取り違えます。台数は各台が書いた名前から読み戻します。 |
| `make test-merge` | 分割の blob を合流させ、カバレッジのしきい値を検証します。 | 合流後の母数と到達は 1 台で全量を走らせたときと同じになるため、**閾値そのものは緩みません**。 |
| `make gate-typecheck` | 帯が `ci-first` でなければ型チェックを実行します。 | hook が呼びます。帯が `ci-first` のときは委ねた先のワークフロー名と理由を出して素通しします（委ねる先は `typecheck.yaml`）。 |
| `make gate-test-full` | 帯が `ci-first` でなければアプリのテストをカバレッジ付きで実行します。 | 同上（委ねる先は `test.yaml`）。 |
| `make gate-scripts-test` | 帯が `ci-first` でなければ補助スクリプトのテストを実行します。 | 同上（委ねる先は `scripts-check.yaml`）。 |
| `make load-status` | ローカルゲートの負荷帯と 1 窓あたりの CPU 配分を表示します。 | 帯は測って決めます（[ADR 0151](../docs/adr/0151-git-hooks.md)）。**出力そのものが答えなので `make ai-<target>` で包みません。** |
| `make build-storybook` | Storybook を静的に build します。 | VRT の撮影対象。`make vrt` / `make vrt-update` / `make a11y` が前段で呼びます。`storybook build` は preview の build が失敗しても 0 を返すため、生成物（`iframe.html` と `assets/`）の存在を見てから成功を返します。ENV の検証で落ちているときは `APP_ENV` を明示します。 |
| `make a11y` | 全 story に axe を掛けます。 | VRT と同じ digest 固定のコンテナ・同じ story 列挙で実行します（[ADR 0091](../docs/adr/0091-test-verification-methods.md)）。基準画像は要らないので置き場の配線も要求しません。省略判定は自前の記録（`tmp/a11y/`）だけを見ます —— 基準画像を撮った時点の記録を流用すると、axe が落ちる状態で撮り直しが起きたとき、以後その状態を「一致」と読んで緑を報告します。 |
| `make vrt [VRT_SHARD=<i>/<N>] [VRT_ARGS=<args>]` | 全 story を基準画像と比較します。`VRT_SHARD` は撮影対象の何分割目かで、渡すのは CI だけです。 | digest 固定した Playwright コンテナ内で実行します（[`vrt/README.md`](../vrt/README.md)）。ホスト直実行は比較の前に落ちます。置き場が未配線・未取得なら比較の前に名指しで案内して止まります（取り込まずに回すと全 story が「基準画像が無い」で落ち、退行と見分けが付かないため）。比較を省いた実行でも、基準画像と story の 1 対 1 の対応だけは 1 台目（割っていないか `1/N`）が検査します —— 数える相手は置き場のファイルと story の全目録で、台の数だけ繰り返しても同じ答えしか出ないためです。割った実行のレポートは `list,blob` で出します —— `--reporter` は設定を上書きするもので足すものではなく、blob だけにすると標準出力に何も残らず、どの story で詰まったかが読めなくなります。spec を名指しするのは a11y の spec を同じ実行に巻き込まないためで、混ざると a11y の失敗が撮り直しの対象に入り、撮り直しても直らないまま基準画像だけが承認済みになります。 |
| `make vrt-retake [VRT_ONLY=<id>,<id>] [VRT_ARGS=<args>] [BASELINE_BRANCH=<branch>]` | 基準画像を撮り直して置き場へ送ります（`vrt-update` → `baseline-push`）。 | 手元から撮り直す入口はこれです。撮って送らないと親の gitlink が古いままになり、手元の `make vrt` は通るのに CI だけ落ちます。 |
| `make vrt-update [VRT_ONLY=<id>,<id>] [VRT_ARGS=<args>]` | 基準画像を撮り直します（置き場へは送りません）。 | `VRT_ONLY` は撮り直す story を id で絞ります（該当 0 件なら失敗）。CI 側の同じ操作は `baseline-retake` ラベルが起動し、直前の実行が報告した story だけを対象にします。全数のときだけ撮る前に区画を空にし、**引数が 1 つでも付いていたら消しません** —— 絞り込みは `VRT_ONLY` だけでなく `VRT_ARGS` の `--grep` / `--project` でも起きるので、狭める引数を列挙して判定すると漏れた引数が「全 story を消して一部だけ撮り直す」になります。知らない引数は消さない側へ倒します。撮った時点の入力のハッシュは撮った直後に書きます —— 送る側で書くと、撮らずに置き場を直した木でも「この入力で撮った」と記録でき、次の実行が比較を省きます。撮り直しは承認ではなく、見た目の判断は置き場の compare ビューを見て PR レビューで行います。 |
| `make baseline-sync` | 基準画像の実体を、いま居るブランチが指す版へ合わせます。 | hook (post-checkout / post-merge) が呼びます。git はブランチを移っても実体を動かさないため、放っておくと指し先から取り残され、その汚れを commit すると間違った指し先が載ります。取り込んでいない作業ツリーでは何もしません（`--init` を付けると worktree を足すたびに置き場を丸ごと取りに行くため、在るものを合わせるだけに留めます）。 |
| `make baseline-push [BASELINE_BRANCH=<branch>]` | 撮り直した一式を置き場へ送り、サブモジュールのポインタを進めます。 | 置き場へ送る経路はここだけです。サブモジュールの中で直接コミットすると撮り直しどうしが繋がり、掃除でどれも落とせなくなります。`BASELINE_BRANCH` の既定は現在のブランチ。 |
| `make vrt-gate` | 比較を省いてよいかだけを答えます（`run` / `skip`）。 | **`build-storybook` の後でしか答えられません** —— 絵を決める入力に `storybook-static` が入っているためで、CI が「先に判定してから撮影を割る」形を取れない理由もこれです。 |
| `make vrt-record-verified` | 検査が通った時点の入力のハッシュを記録します。 | CI が呼びます。割った実行では**全 shard が緑になってから**書きます（`vrt.yaml`）。手前で書くと、落ちた状態を「通った」として残します。記録は 2 つあります —— **撮った時点**（置き場が画像と同じコミットで持つ）と**検査が通った時点**（`tmp/` に置き、CI は cache で持ち回る）。分けるのは、絵を変えない変更でも `storybook-static` のバイト列は動くためで、撮影時点の記録だけでは一致する窓がほとんど閉じます。追跡下に置かないのは、これが木の状態ではなく「その木を検査した」という実行の履歴だからです。 |
| `make vrt-report` | 直前の実行の HTML レポートを開きます。 | 出力は `tmp/vrt/`（追跡対象外）。 |
| `make e2e [E2E_ARGS=<args>] [E2E_PORT=<port>] [E2E_HOSTNAME=<addr>]` | build したアプリを実際のブラウザで動かし、主要ジャーニー・ブラウザが報告する異常・帯ごとの出し分けを 3 つの描画エンジンで回して、画面単位の見た目を基準画像と比べます。 | **アプリはホスト、ブラウザはコンテナ**で動きます（[`e2e/README.md`](../e2e/README.md)）。`node_modules` は入れた OS と CPU 向けに解決されるため、コンテナ内で `next start` は起動できません。起動と後片付けもこのターゲットが持ちます。相手はモックでなければならず、`APP_ENV` の既定を `ci` に固定します —— 既定の `local` は live を指すので、明示していない呼び出しを実物のバックエンドへ向けません。待ち受けるアドレスはコンテナが到達に使う経路 1 本へ絞ります —— この起動が使う `APP_ENV=ci` ではテスト専用の session 発行の口が開いているため、全インターフェースで待ち受けると LAN から叩ける状態になります（Docker Desktop は loopback で届き、Linux では bridge の gateway が宛先になるので OS で解決を分けます）。別 origin から BFF を呼ぶ検証のため、宣言した origin の文書だけを返すサーバをアプリと同じホストに立て、その origin を `HTTP_ALLOWED_ORIGINS` へ渡します —— ブラウザの中で文書を偽装する手は採りません。Chromium は偽装した文書を公開ネットワーク由来と扱い、ホストへの fetch を Private Network Access で止めるためです。 |
| `make e2e-maintenance [E2E_PORT=<port>] [E2E_HOSTNAME=<addr>]` | `APP_MAINTENANCE_MODE=on` でアプリを起動し、全ルートが停止画面へ差し替わること・生存確認が通ること・状態を変える要求が 503 で断られることを確かめます。 | `make e2e` と同じ立て付け（build → 起動 → コンテナのブラウザから当てる → 片付け）に、起動の環境と当てる設定だけを差し替えて乗せています。**基準画像を撮らない**ので置き場（submodule）を要求しません。停止は全ルートに効き、切り替えに起動し直しが要るため、通常の巡回へ混ぜられません（[`e2e/README.md`](../e2e/README.md)）。 |
| `make e2e-metadata [E2E_PORT=<port>] [E2E_HOSTNAME=<addr>]` | `SITE_INDEXABLE=on` でアプリを build して起動し、`robots.txt` が巡回を許すこと・`sitemap.xml` が挙げる URL が実在し自分を正規 URL として名乗ること・アイコンと OG 画像が絵として返ることを確かめます。 | `make e2e-maintenance` と同じ立て付けですが、**build から差し替えます** —— 静的に描かれる画面の metadata は build 時の設定で焼き込まれるためです（[`src/config/site/site.server.ts`](../src/config/site/site.server.ts)）。外から見た origin にはコンテナから見たアプリの場所を渡し、画面が名乗る URL と開いた URL を同じ綴りにします。索引させない側は通常の巡回が見ます（[`e2e/README.md`](../e2e/README.md)）。 |
| `make e2e-update [E2E_ARGS=<args>]` | 画面の基準画像を撮り直します（置き場へは送りません）。 | 送るのは `make baseline-push` です。画面の基準画像も story と同じ置き場の `screen/` 区画に入ります。撮り直しは承認ではありません。 |
| `make e2e-retake [E2E_ARGS=<args>]` | 画面の基準画像を撮り直して置き場へ送ります（`e2e-update` → `baseline-push`）。 | 手元から撮り直す入口はこれです。story 側の `make vrt-retake` と同じ関係で、撮って送らないと親の gitlink が古いまま残ります。 |
| `make e2e-build` | 画面を通した検証が使う本番ビルドを作ります。 | `make e2e` / `make lighthouse` が前段で呼びます。単体で叩くのは、起動だけを繰り返して切り分けるときです。build の前に `.next/cache/fetch-cache` を捨てます —— `cache: "force-cache"` の取得結果はそこに残り、CI では別ブランチの build が作ったものが復元されるため、残したまま撮ると絵が木の状態ではなく「前の build が何をキャッシュしたか」で決まります。生成物（`.next/server/app`）の存在を見てから成功を返します。 |
| `make e2e-run` | アプリを起動してブラウザから当て、終了時に後片付けします。 | 同じく `make e2e` / `make lighthouse` から呼ばれます。起動・待ち受け・片付けの 1 組をここが持つので、上位のターゲットは環境と当てる設定だけを差し替えます。 |
| `make e2e-report` | 直前の実行の HTML レポートを開きます。 | 出力は `tmp/e2e/`（追跡対象外）。trace も同じ場所に出ます。**レポートサーバとして常駐するので `make ai-<target>` で包みません。** |
| `make lighthouse [E2E_PORT=<port>] [LIGHTHOUSE_SHARD=<i>/<n>]` | `e2e/lib/screens.ts` が宣言する画面を 1 枚ずつ Lighthouse で開き、LCP / CLS / TBT を `performance-budget.yaml` の上限と照らします。 | 起動は `make e2e` と同じ仕組みを使い、**ブラウザだけホストで動かします** —— 比べるのが画素ではなく数値なので、固定すべきはフォントのラスタライズではなくブラウザの版で、それは lockfile の `@playwright/test` が担います。基準画像は要らないので置き場の代わりに、測るブラウザがホストに入っていることを確かめます。画面ごとに複数回測って中央値を採り、回数も同じ宣言が持ちます（[ADR 0101](../docs/adr/0101-performance-budget.md)）。`LIGHTHOUSE_SHARD` は機械を割る指定で、**1 台の中で並べる指定ではありません** —— 測っているのは CPU 律速の値なので、同じ機械で並べた時点で互いの CPU を奪い合います。割るのは PR の待ち時間のためだけです。待ち受けは loopback に固定します —— bridge の gateway で待ち受けると、テスト専用の session 発行口が見る `Host` がその IP になり、開ける宛先の集合のどれとも一致せず 404 が返って役割の要る画面が開けません。**直すときに宛先の集合を広げてはいけません** —— あれは設定を誤って公開したときに被害を手元へ留める線で、広げれば任意の役割の session を発行する口の露出面がそのぶん広がります。 |
| `make lighthouse-gate` | 測定を省いてよいかだけを答えます（`run` / `skip`）。 | 数える入力は build 生成物ではなく元なので、**台を割る前の段で 1 度だけ引けます**。撮影側（`vrt-gate`）が台ごとに引くのは `storybook-static` を数えているためで、こちらにその制約はありません。 |
| `make lighthouse-record-verified` | 予算を通った時点の入力のハッシュを記録します。 | CI が呼びます。割った実行では**全台の結果を知っている束ねる側**が書きます（`lighthouse.yaml`）。 |
| `make lighthouse-merge` | 分割した台の結果を束ね、予算と照らします。 | 判定を持つのは束ねる側だけです。台ごとに予算を掛けると、割り方を変えるたびに落ち方が変わる検査になります。 |
| `make lighthouse-report` | 直前の実行が残した LHR から、動いた要素・押し下げの量・重い script を引きます。 | 出力は `tmp/lighthouse/`（追跡対象外）。**出力そのものが答えなので `make ai-<target>` で包みません。** |
| `make vrt-review BRANCH=<branch> VRT_ONLY=<id>,<id> [RUN=<run-id>] [VRT_REVIEW_PORT=<port>]` | CI が落とした story を、使い捨ての作業ツリーで立てた Storybook に並べます。 | 引数は PR コメントがコピー用の 1 行として書き出します。**手元の作業ツリーは動かしません** —— `tmp/review/vrt/<ブランチ>` に `origin/<ブランチ>` を切り離して展開します。`RUN` を渡すと `vrt-diff` も落として隣のポートで配ります（`gh` が要る）。ここで見えるのは「なぜ変わったか」であって画素の一致ではありません（ホストのフォントで描くため）。撮影側と入口を分けてあるのは、こちらが比較も撮り直しも行わず、コンテナも置き場も要らないためです。`VRT_ONLY` / `E2E_ONLY` は撮影側と同じ集合を同じ名前で受けます。 |
| `make e2e-review BRANCH=<branch> E2E_ONLY=<name>,<name> [RUN=<run-id>] [E2E_REVIEW_PORT=<port>]` | CI が落とした画面を、使い捨ての作業ツリーで起動したアプリに並べます。 | 起動するのは**本番ビルド**です（画面の基準画像がそれで撮られているため）。役割の要る画面は行き先を持たせた開発用 session の面を経由します。待ち受けは loopback へ絞ります —— `APP_ENV=ci` で session 発行の口が開いているためです。 |
| `make review-clean` | 上の 2 つが生やした作業ツリーを、git の登録ごと片付けます。 | 作業ツリーは Ctrl-C では消えず、`node_modules` と build 生成物を抱えたまま `tmp/review/` に溜まります。ディレクトリを直接消すと実体を失った登録が残り、次の `git worktree add` がそこで断られるため、片付けはこの入口から行います。 |

## `.makefiles/security` 系

シークレットの混入・脆弱な依存・自分が書いたコードの脆弱なパターン・配信面の欠落をローカルで検知するための
スキャンと、抑止と pin の棚卸しです（[ADR 0110](../docs/adr/0110-security-operations.md)）。依存スキャナが
「引き込んだライブラリが既知の脆弱性を持つか」を問うのに対し、SAST は「自分が書いたコードが脆弱なパターンを
含むか」を、DAST は「走っているアプリが宣言どおりに配信しているか」を問います。

抑止は `.gitleaks.toml` / `.gitleaksignore` / `.trivyignore.yaml` に限定し、各ファイル冒頭の抑止ポリシーに従って理由付きで記録します。**`make audit` だけは抑止ファイルを持ちません** —— 閾値が「修正版がある」ことなので、抑止するくらいなら上げられる、という前提で組んであります。上流が脆弱な版を厳密固定していると、この前提は崩れます。

| コマンド | 説明 | 補足 |
| --- | --- | --- |
| `make secret-scan` | push 予定のコミット範囲を gitleaks でスキャンします。 | pre-push hook から実行されます。対象は「`HEAD` から辿れてどのリモートにも無いコミット」で、作業ツリーを見る dir モードは採りません —— commit 後に作業ツリーから消した秘密（blob は履歴に残り push される）を取りこぼし、push されない gitignore 済みファイルを誤検知して hook の bypass 常用を招くためです。リモート追跡参照が 1 つも無ければ履歴全体が対象になります（広がる向きで、取りこぼす向きではない）。**CI は `SECRET_SCAN_LOG_OPTS` で範囲を差し替えます** —— PR のブランチは `origin` に在るため既定では対象が 0 件になり、走査せずに緑を返します。検出時は exit 1 で失敗します（fail-closed）。検出値は `--redact` で出力せず、`--no-color` で非 TTY のログを化けさせません。 |
| `make secret-scan-history` | コミット履歴全体を gitleaks でスキャンします。 | CI の週次実行だけが呼びます。マージ済みの履歴に埋もれた秘密を拾う用途で、走査時間がコミット数に比例して伸びるため hook には載せません（撤回条件は [0110](../docs/adr/0110-security-operations.md) の 2）。 |
| `make trivy-fs` | 依存ライブラリの脆弱性を Trivy fs でスキャンします。 | 手動実行専用で、**意図的に hook へ接続していません**。exit code でも落としません。脆弱性は push する当事者がその場で解消できず、diff と独立に状態が変わるためです。ブロックは昇格ゲートが持ちます（[ADR 0110](../docs/adr/0110-security-operations.md)）。 **CI だけが `TRIVY_FS_DETECT_EXIT=1` を渡し**、検出を exit code で受け取ってコメントの要否を決めます（手元の既定は 0 で、従来どおり落ちません）。`--ignore-unfixed` で修正版のあるものだけを報告し、抑止ファイルは自動検出に頼らず `--ignorefile` で名指しして適用先をこのターゲットに閉じます。`--skip-version-check` で trivy 自身の更新確認の通信を止めます（版は `mise.toml` が SSOT）。 |
| `make trivy-fs-release` | 昇格前の依存脆弱性を Trivy fs で厳格にスキャンします。 | 保護ブランチ宛 PR で CI が呼ぶゲート。上の報告専用との差分は `--ignore-unfixed` を外すことだけで、severity の範囲は同じです。検出で exit 1。 |
| `make opengrep-rules` | SAST のルールを固定した commit から取り出します。 | `make sast` / `make sast-sarif` の前段で自動的に走ります。レジストリ（semgrep.dev）を引かない理由と、検体を置かない取り出し方は [`.github/workflows/README.md`](../.github/workflows/README.md) の「SAST のルールをレジストリから引かない」が持ちます。固定値は `opengrep-rules-pin.toml`（`.github/actions-pin.toml` と同じ形）が持ち、commit を上げるときは `pnpm exec tsx scripts/opengrep-rules --resolve --commit <sha>` が書き直します。 |
| `make sast` | 自分が書いたコードの脆弱なパターンを opengrep で検査します。 | **0 件の baseline を前提にしたゲート**で、所見があれば exit 1。許容する所見はソースへ `// nosemgrep: <rule-id>` を理由付きで置きます。GitHub の外へ持ち出せる SAST としてここに置き、ローカルでも CI でも同じコマンドが回ります。手で書いたソースだけを対象にし、生成物（生成した client / モックの handler）は外します —— 編集できないものの所見は行動につながらず、出るなら直す先は契約か生成器です。`--taint-intrafile` でファイル内の taint 追跡を有効にします（パターン一致だけでは、値の出所が別の行にある形を拾えません）。 |
| `make sast-sarif` | 同じ検査を SARIF で書き出します。 | code scanning への取り込み用。**検査条件は `make sast` と同じ変数を読む** —— ゲートと Security タブの一覧が違う走査を指すと、どちらも信用できなくなります。書き出したあと `scripts/sarif` が整えます —— `// nosemgrep:` で抑止した所見は SARIF に残るため、落とさないと Security タブにだけ積み上がります。 |
| `make osv-scan` | 依存の脆弱性を OSV データベースで見ます。 | 報告専用。Trivy とも `pnpm audit` とも参照先が違うので件数は一致しません。**CI だけが `OSV_DETECT_EXIT=1` を渡し**、検出を exit code で受け取ってコメントの要否を決めます（手元の既定は 0 で、従来どおり落ちません）。 |
| `make osv-scan-release` | 昇格前の依存脆弱性を OSV で見ます。 | 保護ブランチ宛 PR で CI が呼ぶゲート。検出で exit 1。抑止は `osv-scanner.toml` が持ち、**フィルタした所見は理由付きで出力に残ります**。 |
| `make dast` | 走っているアプリへ HTTP を撃ち、配信面を検査します。 | **ここだけが成果物ではなく応答を読みます** —— CSP と同伴ヘッダが宣言どおり配信されているかは、成果物を読んでも分かりません。撃つ相手は `DAST_TARGET` で渡します（既定はコンテナから見たホストの :3000。走るのがコンテナの中だからで、CI はランナー内で起動したアプリを、手元では `pnpm start` したものを指します）。受動走査（baseline）を採り、OpenAPI 駆動の api-scan は採りません —— この層は表示層で API は別リポジトリが持つため、撃つ先が実質ありません。ファイルのパスはすべてマウント点（リポジトリ直下）からの相対で、cwd では動きません。既知の欠落は `.github/zap/rules.tsv` の一覧が持ち、**一覧に無い所見は exit 1**。ZAP は `IGNORE` にした規則も出力に残すので、黙殺と区別が付きます。 |
| `make bearer-scan` | 値がプロセスの外へ出る地点を、その値の分類と併せて見ます。 | opengrep も CodeQL もパターンや taint 経路をそれ自体の条件で判定するだけで、**logger へ届いた文字列がメールアドレスであること**は知りません。**落としません。** 誤検知の傾向が強く、fail-closed にすると規則単位の無効化へ寄っていくためです（それは禁止）。所見は code scanning へ送り、差分が持ち込んだものを GitHub 側のチェックが赤にします。走査から外すパスは「秘密ではないと分かっている値」のファイルだけに限り、**個別の誤検知は `bearer.ignore` がフィンガープリントで受けます** —— パスで外すと、そのファイルに後から入る本物の所見まで消えます。 |
| `make bearer-sarif` | 同じ検査を SARIF で書き出します。 | code scanning への取り込み用。所見が 0 件のとき Bearer は `results: null` を書きますが SARIF にその値は無いため、`scripts/sarif` が配列へ揃えます。揃えないと取り込みが弾かれ、「所見が無い」と「報告できていない」が見分けられなくなります。 |
| `make suppression-expiry` | 抑止の撤回条件を突き合わせ、満たしたものか様式を欠くものがあれば落とします。 | 週に一度 CI が回します。**限界が 2 つあり、報告がそれを名指しします。** 決められるのは日付だけなので出力は全件の一覧を伴い、理由をコメントに持つ面（gitleaks / zizmor / pnpm の override / sonar）は宣言単位では読めず日付を含む行だけが出ます。冷却の免除（`pnpm-workspace.yaml` の `minimumReleaseAgeExclude` と `mise.toml` の `tools-cooldown-ignore:`）は宣言単位で読み、理由が無い・版を名指ししていない・日付を持たないものを様式違反として落とします。`SUPPRESSION_REPORT` を環境から渡すと issue の本文を書き出します（recipe 行へは展開しません）。 |
| `make tools-cooldown-check TOOLS_COOLDOWN_BASE=<ref>` | `mise.toml` の pin のうち base から動いたものが、配布経路ごとの冷却期間を満たすか検査します。 | PR で CI が base ブランチを渡して回します。窓は配布経路ごとに 2 つあります —— `TOOLS_COOLDOWN_RELEASE_DAYS`（GitHub Releases。`ACTIONS_PIN_MIN_AGE_DAYS` と同じ値）と `TOOLS_COOLDOWN_REGISTRY_DAYS`（npm / PyPI）で、言語ランタイム（`core:`）は窓の対象外です。窓の内側の pin は exit 1、公開日時を引けない pin や経路を持たない backend は exit 2（検査が成立していない）。免除は pin の直上に `# tools-cooldown-ignore: <理由>。<窓が明ける日> に外す` を置きます（[`scripts/tools-cooldown/README.md`](../scripts/tools-cooldown/README.md)）。`GITHUB_TOKEN` が無ければ `gh auth token` を借ります。 |
| `make tools-cooldown-audit` | `mise.toml` の全 pin を冷却期間に照らして棚卸しします。 | 週に一度 CI が回します。手元でも引けます。免除の無いまま窓の内側に居る pin で落ち、免除の期限切れは `make suppression-expiry` が見ます。 |
| `make audit` | 依存監査ゲート（`pnpm audit`）。 | 修正版のある `high` / `critical` が 1 件でもあれば exit 1。閾値が severity と修正可能性の 2 つなのは、到達可能性のフィルタが `pnpm audit` にも osv-scanner の call analysis（JS/TS 非対応）にも無く、現行ツールで引ける最も細い線がこの 2 つだからです。判定と表の組み立ては `scripts/audit-gate` が持ちます。Trivy とは集計単位も参照する DB も違うため件数は一致せず、**突合して差分を潰そうとしません** —— どちらか一方でも閾値に達したものを blocking として扱います（[ADR 0110](../docs/adr/0110-security-operations.md)）。 |

## `.makefiles/agents` 系

### 静音実行関連

| コマンド | 説明 | 補足 |
| --- | --- | --- |
| `make ai-<target>` | 任意のターゲットを静かに実行し、出力を `tmp/ai-logs/<target>.txt` へ退避します。 | エージェントが呼ぶときの既定の形です。置き場が gitignore 済みの `tmp/` 配下なのは、worktree ごとに独立し、窓を跨いだ衝突が無いためです。成功時の出力は 0 バイト、終了コードは素通し、失敗時だけ読むべきログを 1 行で指します。**ハーネスは失敗時に抜粋しか渡さずファイルのパスを渡さない**ため、最も読みたい失敗のときに限って切り落とされた行が取り戻せないという穴を、出力元で塞ぎます。**出力そのものが答えのターゲット**（`help` / `load-status` / `lighthouse-report`）と**常駐するターゲット**（`e2e-report` / `vrt-report`）には使いません —— 前者は読めなくなるだけ、後者は完了しないので呼び出し側が待ち続けます。 |
| `make clean-ai-logs` | 退避したログ（`tmp/ai-logs`）を削除します。 | ログは成功時も残します。生成系のように「落ちてはいないが何が起きたか確かめたい」ときに実行し直さず読めるほうが安いためです。 |

### 開発の窓の観測関連

| コマンド | 説明 | 補足 |
| --- | --- | --- |
| `make closed-loop-report` | 打刻された開発の窓の、段の区間と所見を報告します。 | 読むだけで何も刻みません。打刻は `.agents/closed-loop/marks.sh` が hook とスキルから行い、置き場は追跡外の `tmp/closed-loop/` です。**決定的な集計だけでモデルを使いません**（[ADR 0160](../docs/adr/0160-agent-environment-loop.md)）。窓が 0 件のときは「所見なし」ではなく 0 件であること自体を出します（[ADR 0157](../docs/adr/0157-inspection-declaration-discipline.md)）。 |
| `make closed-loop-send` | 閉じたまま届いていない窓の所見を issue へ送出します。 | **先に `make labels-create-default` を 1 回通しておくこと。**`feedback` 系のラベルが実在しないと `gh issue create` が拒否し、窓は未送出のまま溜まり続けます。送出先は `.git` の remote から導き、設定項目で宛先を持ちません（[ADR 0160](../docs/adr/0160-agent-environment-loop.md)）。送るのは**閉じていて、段の境界を 1 つ以上越えた窓**だけです。通常はセッション開始時に `.agents/closed-loop/send.sh` が自動で回すので、これを叩くのは取りこぼしを手で流すときです。 |
| `make closed-loop-send-dry` | 送出する内容だけを出します。 | 何も送らず、送出済みの索引にも触れません。送出が走っている最中でも見られます。 |
| `make closed-loop-weekly` | 期間ぶんの所見を束ね、点の高い順に並べ、着地した改善を測り直します。 | **週次で `.github/workflows/closed-loop-weekly.yaml` が同じものを回す**ので、手で叩くのは期間を指定して見直すときです。既定は直近 7 日。`ARGS="--from 2026-09-01 --to 2026-09-07"` で期間を指定します。**読むだけで、issue を作りも閉じもしません。**再計測は省略できない段です（[ADR 0160](../docs/adr/0160-agent-environment-loop.md)）—— 省略した時点でループは蓄積器へ退化します。 |
| `make closed-loop-weekly-consolidate` | 同じことをした上で、未クローズの所見を関心へ畳みます。 | **issue を作り、畳んだ大元を閉じます。**畳み込みだけを明示指定にしてあるのは、副作用が既定に入ると意図しない畳み込みに誰も気づかないためです。 |

## 関連する ADR

ここに居るターゲットが従う決定。**レシピのコメントからは ADR を直接指さず、この節を辿る** ——
ADR は番号も節も決定の所在も動くが、README は区画と一緒に動くので、動きがレシピへ波及しない
（[docs/rules.md](../docs/rules.md)「コメントと文書」）。

- [0090](../docs/adr/0090-testing-strategy.md) — アプリと補助スクリプトで実行を分ける
- [0101](../docs/adr/0101-performance-budget.md) — 上限の置き方と、照らす先が `performance-budget.yaml` であること
- [0110](../docs/adr/0110-security-operations.md) — 監査の閾値 / 抑止の様式 / 所見を黙って素通りさせない
- [0151](../docs/adr/0151-git-hooks.md) — ローカルゲートの帯と、hook から呼ぶ側の責務
- [0153](../docs/adr/0153-ci-configuration.md) — workflow 定義の検査 / secret の渡し方 / 公開の面へ出す文字集合
- [0155](../docs/adr/0155-claude-skills-development.md) — TypeScript で書けない例外としてのシェル
- [0160](../docs/adr/0160-agent-environment-loop.md) — 決定的な集計だけを持ち、モデルを使わない

## 補足

- 既存グループファイルへのターゲット追加ならトップレベル編集は不要。ただし**新規** `.mk` ファイルを追加する場合は、
  トップレベル `Makefile` へ `include` 行の追記が必要（ワイルドカードではなく個別 include のため）
- リリースブランチ / タグ系のターゲットは GitHub のデフォルトブランチを操作し `origin` へ push します。実行前に
  [ADR 0150](../docs/adr/0150-git-workflow.md) を確認してください
