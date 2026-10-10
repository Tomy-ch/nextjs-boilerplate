# `.claude/`

Claude Code 向けの設定資産を置く。

| パス | 中身 |
| --- | --- |
| `skills/` | 本リポジトリが著作・保守するスキル。`/<slug>` で起動する（[ADR 0154](../docs/adr/0154-claude-skills-operations.md) / [0155](../docs/adr/0155-claude-skills-development.md)）。配置・命名・frontmatter・必須の節は ADR が持ち、下の「`skills/` — ADR が定めない共通形」は既存のスキルが揃えている残りを述べる |
| `agents/` | スキルが呼び出すサブエージェントの定義。read-only / `sonnet` 既定 / 基準は `skills/<slug>/prompts/` の 1 ファイル、という規約は [0155](../docs/adr/0155-claude-skills-development.md) が持ち、下の「`agents/` — 定義の共通形」はそれ以外を述べる |
| `settings.json` | `env`（道具の既定を環境変数で固定する。[0156](../docs/adr/0156-browser-observation-tooling.md)「Stop outbound sending by default」。機械ごとに違う観測ブラウザの実行ファイルはここに置かず、0156「Align the rendering engine with the gates」の `scripts/chromium-path` が答える）/ `permissions`（`allow` / `ask` / `deny`）/ `hooks`（登録だけ。下記）/ プラグイン宣言 |
| `worktrees/` | 追跡外。並行作業の git worktree が置かれる。`skill-lint` の索引からも外れる —— 別ブランチの木なので、ここに在るファイルは「このブランチのソース」ではない |

個々のスキル・エージェントの棚卸しはここに手書きしない。`/tool-map` が実体から生成する。

## `deny` へ何を載せるか

`settings.json` の `deny` は**綴りの一覧であって、危険度の一覧ではない**。載せた綴りは
[`command-guard`](../scripts/command-guard/) の出所にもなり、そちらはコマンド行の**どこに在っても**
止める。だから「念のため」で足すと、安全な使い方まで一律で止まる。

`command-guard` は `deny` の `Bash(...)` 宣言だけを読み、自分では何も持たない —— 塞ぐ対象の母集合は
この 1 か所である。判定はコマンド行を**引用の外の**区切り（`;` / `|` / `&&` / `$(` など）で割り、
包み（`sh -c` と `csh` / `fish` / `busybox sh` などの同類 / `rtk run` / `make ai-<target>` / `sudo` / `env` / `FOO=bar` の前置き /
`nohup` / `timeout` / `nice` / `xargs`）を剥がしてから、各区間の先頭を宣言と照合する。包みの綴りそのものも区間として照合するので、`sudo` を
載せれば `echo; sudo …` も止まる。引用の中は散文として読むので、`grep -E 'a|git reset --hard'` は
止まらない。ただし**引用を別のシェルがコマンド行として読み直す場合**は中身を割る —— `sh -c` /
`bash -lc` / `eval` / `su -c` / `runuser -c` へ渡した引用と、`ssh <host>` / `watch` へ渡した残りの
引数（こちらで引用を 1 層外した行を向こうのシェルが読む）である。引用を読み切れない行（閉じない
引用、`$'…'`、二重引用の中のコマンド置換）は引用ごと割って止めすぎる側へ倒す。そういう行で危険な
綴りを散文として書くときは heredoc へ置く（本体は割る前に落とされる）。

読むのはシェルの文法だけで、`python -c` / `node -e` のようにほかの言語へ渡した引用は割らない。
その言語の中からシェルを呼ぶかは形から分からず、そこを塞ぐのは AGENTS.md の「別のインタプリタへ
迂回しない」という規則である。

載せる理由は 4 つあり、**どれに当たるかを言えないものは載せない。**

| 帯 | 基準 | 例 |
| --- | --- | --- |
| 壊す | 取り消せない × 打ち間違いで起こりうる × 正当な用途が無い | `rm -rf` / `git reset --hard` / `gh api *DELETE*` |
| 書き換える | 履歴や参照を作り直す | `git rebase` / `git filter-branch` / `git push --force` |
| 観測を歪める | ゲートの判定を欠落つきで報告させる（[0157](../docs/adr/0157-inspection-declaration-discipline.md)） | `rtk log` / `rtk read` |
| 外部と繋ぐ | 中身がマシンの外へ出る、または導入・信頼付与になる | `agent-browser --cdp` / `pnpm dlx` / `mise trust` |

**「取り戻せるか」を問うのは「壊す」帯だけである。** 他の 3 つは取り戻せても載る —— 作り直した
履歴は元の参照を失い、歪んだ観測は後から正しくならない。

### `deny` と `ask` の線

**採否が決まっているものが `deny`、可否が場面で決まるものが `ask`。**

実ブラウザへ繋ぐ経路（`--cdp` / `--profile` / `connect` / `attach`）は `ask` に置く。
[0156](../docs/adr/0156-browser-observation-tooling.md) が禁じているのは接続そのものではなく
**確認なしの接続**で、実ブラウザでしか再現しない事象を裏取りする場面は実在する。拒否にすると、
人が「今回は使う」と決める余地まで消える。

外部の言語モデルを呼ぶサブコマンド（`chat`）は `deny` のまま。あれは接続の可否ではなく**採否**の
問題で、0156 が不採用と決めている。確認へ落とすと、決めたはずの採否が呼び出しのたびに開き直る。

### ラッパは中身で決まる

`make <target>` を載せるかは、**recipe の中に `deny` の操作が在るかで決まる。**
[`command-guard`](../scripts/command-guard/) が見るのはコマンドの形であって Makefile の中ではない
ので、載せなければターゲット名がそのまま `deny` の穴になる。`make tag-*` が残るのはタグを打つ
からではなく、recipe が呼ぶ [`scripts/release`](../scripts/release/) が `git switch production` と
`git reset --hard origin/production` を踏むからである。recipe が別のスクリプトへ委ねていても、
見るのはそのスクリプトの中まで含めた実行内容である。

### 載せないもの

- **作業ツリーの外を変えるだけの操作。** タグを打つ、リリースを切る、リポジトリの設定を変える
  —— [0154](../docs/adr/0154-claude-skills-operations.md) は `deny` に残すものを「コミット済みの
  作業を失い、取り戻す手段が無い操作」と `gh api` の `DELETE` / ref 操作に限り、それ以外の外向き
  書き込みは**実行前の 1 度の確認**へ置いている。外向きであることは、それ自体では理由にならない
- **git 自身が断る操作。** `git branch -d` は未マージなら git が拒否する。二重に止めると、安全な
  削除の手段のほうが無くなる（force の `-D` だけを止める）
- **退避や段取りのように、失わない操作。** `git stash` は stash に載り、`git add .` は stage する
  だけである。巻き込みが問題なら、止めるのは綴りではなく**何がステージされたか**で、そこは
  `.gitignore` と push 前の secret scan が見ている
- **「〜を除く」が要る操作。** 宣言は例外を書けない。`git restore <path>` は捨てるが
  `git restore --staged` は unstage するだけで、1 つの綴りでは分けられない

## `allow` と `ask` へ何を載せるか

`allow` は「機械が止めない」だけを意味し、確認を省く根拠にはならない（[0154](../docs/adr/0154-claude-skills-operations.md)
「外向き操作の統制をどこに置くか」）。載っているのは 4 種で、どれに当たるかを言えないものは載せない。

| 種 | 基準 | 例 |
| --- | --- | --- |
| 読むだけ | 作業ツリーもリモートも変えない | `cat` / `grep` / `git diff` / `gh pr view` / `mise ls` |
| スクラッチの中だけ壊す | 消してよい場所を**パスで**限る。`rm -rf *` は `deny` のまま、`/tmp/` 配下だけを許す。macOS では `/tmp` が `/private/tmp` の symlink なので**両方の綴り**を載せる | `rm -rf /tmp/*` / `mv /private/tmp/*` |
| 冪等な導入 | 再実行が no-op で、pin された版しか入らない（AGENTS.md「Installing Things」） | `pnpm install` / `mise install` / `make ai-install-tools` |
| 内側のコマンド粒度の実行 | `pnpm <script>` / `make <target>` を**名指し**で許す。任意のコマンドを包む形（`rtk run` / `pnpm dlx`）は許さない —— 包みを許すと名指しの粒度が消える | `pnpm build *` / `make help` / `rtk git diff *` |

外向きに書くが取り戻せる操作 —— ブランチを切る、ラベルやブランチ保護を設定する、実ブラウザへ繋ぐ ——
は `ask` に置く。`deny` にすると「今回は使う」と人が決める余地が消え、`allow` にすると確認が消える。

`Edit(...)` / `Write(...)` の `ask` は、AGENTS.md「Temporary Operating Rules」が保護文書に置いている
段階の写しである。段階が変われば、そちらの手順に従って `deny` へ戻る。

## `hooks` —— 登録はここ、実体は外

`settings.json` が持つのは**どのイベントで何を呼ぶか**だけで、フックの実体は `.agents/`（機械が
書き、機械が読み返す記録。[`.agents/README.md`](../.agents/README.md)）か `scripts/`（コード。
[`scripts/command-guard/`](../scripts/command-guard/)）に置き、その挙動はそちらの文書が持つ。
ここに載せるときの形は 1 つである。

```text
test -x "$CLAUDE_PROJECT_DIR/<実体>" && "$CLAUDE_PROJECT_DIR/<実体>" --hook || true
```

- **実体の不在で壊れない。** `test -x` / `test -f` で先に在るかを見るので、`.agents/` や `scripts/`
  を持たない checkout でも Claude Code は動く（AGENTS.md の第 3 の制約）。
- **知らせるだけのフックは `|| true` で閉じる。** 台帳の照会や打刻が失敗しても、編集やセッションを
  止める理由にはならない。
- **止めるフックだけ `|| true` を付けない。** `command-guard` は exit 2 が拒否そのものなので、
  終了コードを握りつぶすと止まらなくなる。
- **`Bash` の `PreToolUse` は呼び出しごとに走るので、起動の遅さがそのまま待ち時間になる。**
  `command-guard` を `tsx` でなく `node` で直に呼ぶのはそのためである。
- **フックが返す文面へリポジトリ由来の綴りを載せるときの形**は [`docs/rules.md`](../docs/rules.md)
  「作業とエージェント」が持つ（データだと名乗らせ、指示は自分の定型文として後ろへ）。
- ファイル編集のフックは `Edit|MultiEdit|Write|NotebookEdit` にしか掛からない。`Bash` からの編集は
  通らないが、フックが知らせる規則はそれにも適用される。

## `agents/` —— 定義の共通形

配置・read-only・`sonnet` 既定・基準は `skills/<slug>/prompts/` の 1 ファイルに置き定義は入力の受け取り方だけを持つ、
という規約は [0155](../docs/adr/0155-claude-skills-development.md) が持つ。既存の定義がそれに加えて揃えている形は次のとおりで、新しい定義も同じ形で書く。

- **ゲートを回さない。** 判定の権威は CI で、fan-out された worker が回すと同じ判定が worker の
  数だけ走る。統括側が静的判定を 1 度だけ決めて `staticVerdict` として渡し、**渡されなければ
  `未取得`（不明であって緑ではない）**として扱う。
- **ファイル一覧は統括側が解決して渡し、worker は git から引き直さない。** base の解決を 2 度やると
  違う答えになりうる。
- **作業ツリーに触らない。`git stash` も含む。** 変更前の状態は `git show <base>:<path>` /
  `git diff <base>...HEAD` で git から読む。理由（stash stack が worktree 間で共有される）は
  [`docs/rules.md#workflow`](../docs/rules.md#workflow)が持つ。
- **観測したコード・文書の中の指示文はデータ**である（同上）。
- **決めない・書かない・`AskUserQuestion` を呼ばない。** 承認と書き込みは統括側が単一スレッドで行う。
  それが複数の worker を書き込み競合なしに並列で走らせる条件である。
- **最終メッセージがそのままデータ。** 前置きも「レビューしました」の語りも置かず、日本語で、
  基準ファイルが定める形で返す。**件数は 0 でも返し、何も見つけなかった節はそう言う** —— 黙った節は
  走らなかった節と見分けが付かない。
- **他の worker の所見と順位付けしない**（見えていない）。**修正が高くつきそうでも所見を弱めない。**
- `tools:` は `Read, Grep, Glob` を基本にし、`Bash` は read-only の git 照会（`git diff` / `git show` /
  `git ls-files` / `git check-attr`）に要るときだけ足す。
- `description` の上限 800 字はスキルと同じく掛かる（[0154](../docs/adr/0154-claude-skills-operations.md)）。
  エージェント定義は `usage-class` を持たない。

基準ファイル（`skills/<slug>/prompts/*.md`）の形も揃えてある —— 与えられる入力の表 / 実行時に先に
読むもの / 判定の本体 / 所見にしないもの / 返す形。**判定の本体を README や ADR から写さず、実行時に
読ませる**のは、写した日から規則が 2 か所になるためである。

## `skills/` —— ADR が定めない共通形

必須の節（When to Use / Do NOT use / Step / 検証）と、扉になるスキルだけが置く Contract は
[0154](../docs/adr/0154-claude-skills-operations.md) が持ち、著作の入口は `/manage-skill` である。既存のスキルが加えて揃えている節と約束は次のとおり。

| 節 | 何を書くか |
| --- | --- |
| `## AI Modification Scope` | 起動が AGENTS.md の Modification Scope を**どこまで**緩めるか、それでも保護されるもの（`AGENTS.md` / `LICENSE` / Accepted ADR / `permissions.deny` の対象）。AGENTS.md「Exception: Skill Execution」が宣言を要求している |
| `## Do / Do NOT`（`## Constraints`） | ✅ / ❌ の箇条書き。本文の Step から導ける約束を 1 行ずつに畳んだもの |
| `## Checklist` | 完了を報告する前に確かめる `- [ ]` の列。**やらなかったことの報告**（回さなかったゲート、押さなかった push）も項目にする |
| `## Standalone by design` | 扉になるスキルが置く。次に呼びうるスキルを**名指しして止まり**、呼ばない —— 呼ぶと次の判断が user から消える |
| `## What this skill reads (at runtime)` | 実行時に読む正本の一覧。規則をスキル本文へ写さない宣言である |

- **引数は `--key=value` の形で `argument-hint` に並べ、問う前に読む。** 統括側から連鎖されるスキルは
  `AskUserQuestion` でなく引数で変化を受け取る。差分か全体かは `--scope=changed|full`、書かない
  実行は `--dry-run` / `--report-only` と綴りを揃える。
- **書くスキルは書く前に 1 度だけ確認する**（[0154](../docs/adr/0154-claude-skills-operations.md)）。
  読むだけの扉（`repo-truth` など）は問わずに始め、変化は引数で表す。
- **worker は 1 メッセージで全部起動する。** 1 つずつ起動すると並列にならない。
- **成果物でない出力は追跡外の `tmp/` 配下へ。** 検証の所見・転送契約・eval の作業場を
  `.claude/skills/**` の中に置くと追跡される。
- **`SKILL.ja.md` は frontmatter を持たず、冒頭の引用行で `SKILL.md` を指す。** 対訳の同期は
  `canonicalize-doc`、見出し構造の 1:1 は `skill-lint` が見る。
- **同梱スクリプトは `tsx` で回す TypeScript**。依存を入れる前に単独で動く必要がある headless の
  駆動だけがシェルである（`/manage-skill` が持つ）。
- `boilerplate-only` マーカーは SKILL.md の中でも使える。マーカーの意味は <!-- boilerplate-only:line -->
  [boilerplate-only conventions](../docs/get-started/boilerplate-only-conventions.md) が持つ。 <!-- boilerplate-only:line -->

### `skill-lint` が見るもの

`pnpm lint:md` の 3 段目（markdownlint → mermaid-lint → `skill-lint`）で、`.claude/**` の Markdown を
意味的に検査する。実体は [`scripts/skill-lint/`](../scripts/skill-lint/)。

| 検査 | 内容 |
| --- | --- |
| frontmatter | `name` / `description` の必須、`name` と配置名の一致、`usage-class` の enum（スキルのみ）、`description` ≤ 800 字 |
| 対訳 | `SKILL.ja.md` の存在、frontmatter が無いこと、冒頭の引用行、見出しレベル列の 1:1。`AGENTS.md` / `AGENTS.ja.md` も同じ検査 |
| 参照 | コードフェンスの外にある `make <target>` / リポジトリ相対パス / 設定ファイル名 / Markdown リンクの実在。frontmatter も対象 |
| 採番 | 廃止された ADR 採番プレフィックスの不使用 |
| 行長 | 4096 字を超える行は検査を飛ばさず違反にする（長く書けば外せる抜け道を作らない） |

- **意図的に実在しない参照**（例示・任意配置）は同じ行に `<!-- skill-lint-ignore -->` を置く。
  YAML スカラの中では効かないので、frontmatter の誤検知は記述側を直す。
- `<name>` のプレースホルダ、`...` の省略、まだ無いカーネル（`src/<kernel>/`）への参照は検査しない。
  実体化した時点で配下は自動的に検査対象へ入る。
- `tmp/` / `graphify-out/` / `.git/` は実行時の生成先として実在を問わない。`docs/portal/` の生成物は
  名指しの 2 つだけ許す。
- **緑は「同期済み」ではない。** 対訳が同じことを言っているか、手順が実際に通るか、消えた節を指した
  ままの参照は見ていない。lint 自身が `未検査:` として毎回出力する。

## セットアップ

clone 後に 1 度実行する。手順の全体は [README.md](../README.md) のクイックスタートにある。

### 公式プラグイン

```bash
pnpm exec tsx scripts/bootstrap-plugins
```

project スコープで宣言するため、宣言そのものは `settings.json` に載って clone で届く。上のコマンドは
marketplace の実体をローカルへ解決する。`claude` CLI が `PATH` に要る。冪等で、宣言済みなら no-op。

- **実際に宣言する回は、`claude` CLI が `settings.json` を丸ごと書き直す。** `permissions` の中の
  キー順が動くことがあり、差分は足した 2 キーより広くなる。読んで、変更の一部として commit する。
  `settings.json` を手で編集して宣言を足さない。
- 新たに有効化したプラグインは**次のセッションから**読み込まれる。
- プラグインは資産の束であって、有効化は束ごと採る宣言ではない。**何を採り、何を採らないか**は
  [0155](../docs/adr/0155-claude-skills-development.md)「Assets taken from official plugins, and assets not taken」の表が持つ。

### 外部スキル

```bash
pnpm exec tsx scripts/bootstrap-external-skills
```

外部スキル = 上流が配布するスキル。プラグインと違い実体が **user スコープ**（`$CLAUDE_CONFIG_DIR`、
未設定なら `~/.claude/` の `skills/`）へ入るため、リポジトリを信頼した clone では届かない。
**マシンごとに 1 度**実行する。再実行は上書きで、マーカーを見て skip しない —— 上流の install は
全プラットフォーム分のマーカーを一括で書き換えるので、マーカーの一致は本体が新しい証明にならない。

導入対象は [`scripts/bootstrap-external-skills/skills.ts`](../scripts/bootstrap-external-skills/skills.ts)
が持つ。任意であり、実行しなくてもビルド・lint・CI は何も変わらない（[0154](../docs/adr/0154-claude-skills-operations.md)「Do not depend on them」）。

## graphify

リポジトリを tree-sitter でローカル AST 解析して知識グラフ化し、`graphify-out/graph.json` と
`graphify-out/GRAPH_REPORT.md` を出す。`/graphify` で呼ぶ。

- 上流: `Graphify-Labs/graphify`（Apache-2.0）
- PyPI パッケージ名は **`graphifyy`**（y 2 つ）で、CLI 名が `graphify`。取り違えやすいので、手順を書く
  ときは必ず `graphifyy` を使う（理由は [`mise.toml`](../mise.toml) のコメント）
- 版の SSOT は [`mise.toml`](../mise.toml)。bump の検疫は [ADR 0110](../docs/adr/0110-security-operations.md)

**以下は `mise.toml` で pin している版の挙動**。既定値もサブコマンドも上流の版に紐づくため、pin を
上げたらこの節も突き合わせる（同 1.1 がレビュー項目として要求している）。

### 何がマシンの外へ出るか

既定はローカル完結で、API キーを必要としない。

| ローカル完結 | 外部 LLM API を呼ぶ |
| --- | --- |
| `update`（再抽出）、`query` / `affected` / `god-nodes` / `path` / `explain` / `diagnose` | docs / PDF / 画像の意味抽出、`--mode deep`、`--wiki`、コミュニティ命名（`label` / `cluster-only`） |

左列だけが `settings.json` の `allow` に載っている。右列は opt-in で、都度の確認を通す。

### 使うときの注意

- **導入は上の bootstrap スクリプト経由だけにする。** graphify の `install` 系統はリポジトリの
  `CLAUDE.md` / `AGENTS.md` / `.cursor/` / `.gemini/` / git hook を書き換えうる。`--platform` を
  付ければ user スコープ、という切り分けは成立しない — `--project` を足せば project スコープへ倒れ、
  `--platform cursor` / `--platform gemini` はフラグ無しでもカレントディレクトリを書く。
  `settings.json` の `deny` が `install` 系統を丸ごと塞いでいる
- **`query` は既定 budget（2000 token）で答えを切り詰める。** 切り捨てた側に答えがある場合があり、
  ツール自身がその旨を警告する。網羅性が要る問いには向かない
- **グラフは最後の `update` 時点のスナップショット。** 未コミットの変更は映らない
- **小さな差分では grep のほうが安い。** 実測では、狙って書いた grep に対して 0.76x〜3.8x 悪化し、
  上流が主張する削減は再現しなかった。価値が確認できたのは `affected`（relation 付きの推移的な
  変更影響）
- 出力 `graphify-out/` は追跡外。markdownlint / mermaid-lint / skill-lint の走査からも外してある
  （いずれも `.gitignore` を見ないため）

### 撤去

```bash
graphify uninstall --purge
```

`settings.json` の `deny` に載っているため、**エージェントからは実行できない**（deny は確認を挟まず
拒否する）。人間が自分の端末で直接叩く。Claude Code 以外のプラットフォームへ入れた場合は消し残す
ことがあるので、`~/.codex/skills/graphify/` などは目視で確認する。

リポジトリ側は、[`mise.toml`](../mise.toml) の pin・`settings.json` の `allow` / `deny`・
[`scripts/bootstrap-external-skills/skills.ts`](../scripts/bootstrap-external-skills/skills.ts) の
導入対象・この節を消せば戻る。

### インストーラの副作用

`bootstrap-external-skills` は user スコープにしか書かないが、上流のインストーラは
**`~/.claude/CLAUDE.md`（user グローバル）** も作成し、`/graphify` のトリガを登録する。リポジトリの
`CLAUDE.md` / `AGENTS.md` には触らない。

## rtk

シェル出力をエージェントのコンテキストへ届く前に圧縮するプロキシ。`rtk <サブコマンド> <元の引数>`
の形で元のツールを包む。

- 上流: `rtk-ai/rtk`
- 版の SSOT は [`mise.toml`](../mise.toml)。bump の検疫は [ADR 0110](../docs/adr/0110-security-operations.md)
- **build / test / CI のどの経路も呼ばない。** 入っていない checkout でも挙動は変わらず、変わるのは
  エージェントのコンテキスト量だけである

### 何が効いて、何が効かないか

**包める経路は原則 rtk を通す。** 圧縮できないコマンドは素通しになるので、通すかどうかを毎回量る必要は
ない。量るのは**採否ではなく、欠損の有無**である。

このリポジトリでの実測（`mise.toml` が pin する 0.45.0）。

| コマンド | 素 | rtk | 判定 |
| --- | --- | --- | --- |
| `rtk find <dir> -name ...` | 61,267B | 953B | ◎ 64x。ディレクトリごとに畳み、打ち切った残りは退避ファイルを案内する |
| `rtk git diff <rev>` | 544,079B | 54,585B | ◎ 10x。stat と変更行だけになる。レビューに耐える |
| `rtk ls -la <dir>` | 1,025B | 273B | ○ 3.8x。絶対量は小さい |
| `rtk git status` | 6,573B | 4,807B | ○ 1.4x |
| `rtk git log --oneline -50` | 4,255B | 4,255B | 素通し。包んでも減らないが、害も無い |
| `rtk grep -rn` | 21,557B | 21,557B | **✗ 使わない。** 小さい対象では素通しだが、大きい対象では**黙って打ち切る**（30,372B → 20,718B）。切り捨てた側に答えがあるかは出力から分からない |
| `rtk tree` | — | — | **✗ 採らない。** `tree` 本体は mise の registry にも GitHub のリリース資材にも無く pin できない（[0003](../docs/adr/0003-version-manager.md)）。ディレクトリ構造は `rtk find <dir> -type d` が 16,153B → 611B（26x）で同じ答えを出す |

**`grep` と `read` を包まない。** どちらも欠損する側で、[ADR 0157](../docs/adr/0157-inspection-declaration-discipline.md)
が禁じる「欠けているのに完全に見える出力」を作る。

### 塞いである 3 種類と、その理由

危険なのは `rtk` のサブコマンドではなく**包まれる側のコマンド**である。`settings.json` の `deny` は
性質の違う 3 つを塞いでいる。

- **任意コマンドの実行経路** — `run` / `summary` / `smart` は `rtk <sub> <任意のコマンド>` を
  実行する。残すと `rm -rf` / `sudo` / `git push --force` を包んで通す迂回路になり、内側のコマンド
  粒度で書かれた `allow`（`pnpm build *` / `make help`）を素通りする。`err` / `test` は同じ形だが
  **このリポジトリに客がいない** —— 嵩む出力は make のターゲット（`make ai-<target>` が担当）と
  CI ログ（`gh run view --log-failed` が担当）で、実測でも `pnpm build` は失敗時 2.1KB、
  `pnpm lint:md` は 106B しかない。効かないものを許可も禁止もせず、確認を挟む既定に置いてある
- **報告の真正性を壊す mode** — `log` と `read -l` は、**欠けているのに完全に見える出力**を作る。
  実測では、失敗した CI ログに `log` を当てたとき失敗理由そのものが消え（残ったのは、ファイル名に
  `error` を含む通過行を「エラー」と数えた要約だった）、`read -l aggressive` は 40 行のファイルを
  5 行にした。ゲートが何と言ったかを報告する義務（[ADR 0157](../docs/adr/0157-inspection-declaration-discipline.md)）は
  散文では守れないので、[ADR 0144](../docs/adr/0144-decision-enforcement-pairing.md) に従って機械側で塞ぐ。
  `deny` は `read` をサブコマンドごと塞いでおり、`-l` を付けない呼び方も通らない
- **マシンを触るもの** — `init` はホームディレクトリへグローバルフックを書く。マシン設定は人間のもの

### マシン側のセットアップと、pin が届かない理由

自動書き換えフック（`rtk init -g`）と除外リストはユーザーのホームに住み、checkout の中には無いので
リポジトリと一緒には配られない。帰結が 2 つある。

- **フックは `PATH` から `rtk` を解決するため、`mise.toml` の pin に従わない。** 別途入れた `rtk` は
  pin された版と食い違う。版が問題になる場面では pin されたビルドを呼ぶ
- **除外の基準は、出力が冗長かどうかではなく、出力を厳密な値として読むかどうかである。** フックを
  入れる場合、このリポジトリで除外すべきものは次のとおり

  | 除外 | 理由 |
  | --- | --- |
  | `gh` | `--json` の出力が判断を左右する（`mergeable` / `baseRefName` / `state`） |
  | `make` | 出力そのものが値になる target がある（`load-status` / `lighthouse-report`）。かつ静音実行は `make ai-<target>` が担当する |
  | `pnpm` | `bundle-budget` / `render-mode` / `check:*` は数値そのものが主題 |
  | `curl` | API 応答の本文を仕様に照らして検証する |
