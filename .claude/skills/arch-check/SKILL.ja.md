> このファイルは `SKILL.md`(canonical / 英語)の日本語参考訳です。スキルとしては読み込まれません(参考用)。

# Arch Check

カーネル単位の層監査の統合役。**read-only の auditor をカーネルごとに並列に fan-out** し、返ってきた
ものを集約する。コードについて何も決めず、コードへ何も書かない。

canonical はこのディレクトリの `SKILL.md`（英語）。規約の正はそちらで、この訳は参考である。

## 使うとき

- 複数のカーネルを触った変更のあと、pull request がレビューされる前。
- リリース前、全カーネルをその README に照らして読む 1 回として。
- カーネル README の `## Audit Criteria` の表が変わったとき —— 基準が動いたので、カーネル全体を読み直す。

**1 つのカーネルだけを監査したいときも、この統合役を回してスコープの質問でそのカーネルを名指す。**

## Contract

| | |
| --- | --- |
| **Owns** | カーネルのコードと、そのカーネル README の「Audit Criteria」の突き合わせ。表そのものの欠け（`forbidden` タグに行が無い）の検出 |
| **Never** | ソース・README・PR への書き込み / 規則をこのスキルや agent に写すこと / auditor にゲートを回させること |
| **Starts when** | 複数カーネルを触った変更の後、リリース前、あるいは「Audit Criteria」の表が変わったとき |
| **Stops when** | 集約した報告を返したとき。直すのは user |

## このスキルを使わない場面

- **import の向き。** `pnpm check:architecture` と ESLint boundaries が決定的に決着させる。このスキルは
  その判定を中継し、導き直さない。
- **設計の妥当性** —— `full-verify` の Pass 1。
- **差分の正しさ・セキュリティ・実行時の振る舞いのレビュー** —— `impl-review`。
- **README が述べていることとコードがやっていることのずれ** —— `back-prop`。README が述べているのに表に
  行が無い規則を auditor が見つけたら報告はするが、表を育てるのは README の所有者の判断であって、ここの
  所見ではない。

## 分担

構造を見るパスは 4 つある。それぞれが 1 つの問いを持ち、互いを繰り返さない。

| パス | 問い | 対象 |
| --- | --- | --- |
| **`arch-check`**（このスキル） | 各ファイルは、そのカーネル README が受け入れる範囲に収まっているか。行ごとに網羅して見る | カーネルのファイルを、README の `## Audit Criteria` の表に照らして |
| `full-verify` Pass 1 | 構造そのものは妥当か —— 宣言された意図と実構造、責務の配置、抽象 | 木全体を設計として |
| `impl-review` の `architecture` レンズ | この変更は型を漏らしていないか、責務を置き違えていないか、依存を名目だけ反転していないか | 差分を意味の面から |
| [`type-design-reviewer`](../../agents/type-design-reviewer.md) | 各型は保証していることをどれだけ強く述べているか。度合いで採点する | `src/model/**` —— ここから回すのは **full スコープのときだけ** |

型設計のパスが full スコープのときだけ相乗りするのは、差分なら `impl-review` から既に届くためである。
同じ差分に対してここからも回すと同じ所見が 2 度出て、読み手にはどちらの所見か区別できない。差分を
持たない問い —— 「いまの `model` はよく型付けされているか」 —— には、他に入口が無い。

## 構成: 並列の auditor と、1 つの静的判定

検出は read-only の [`arch-auditor`](../../agents/arch-auditor.md) agent へ委ね、**in-scope のカーネル
ごとに 1 回ずつ**、1 メッセージで起動して並行に走らせる。エージェント定義は 1 つ、起動は複数 ——
カーネルごとにファイルを置くと、同じロジックを 11 か所で保守することになる。

**基準は [`prompts/audit-layer.md`](prompts/audit-layer.ja.md) に一元化し、規則そのものは各カーネルの
README に一元化する。** このスキルはどちらも書き直さず、エージェント定義も書き直さない。

**静的ゲートの判定はここで 1 度だけ決める。** 全 auditor が同じ判定を受け取り、自分のカーネルに当たる
行を中継する。auditor ごとにゲートを回させると同じ検査が 11 回走るうえ、その判定を持つのはそもそも
CI である（`docs/playbook.md`「Do not pre-run the gates」）。

## Step 0 — スコープと静的判定の出所を確かめる（`AskUserQuestion` 1 回）

2 問をまとめて出す。引数が既に答えている問いは飛ばす。

1. 「アーキ監査のスコープを選んでください」
   - 「変更ファイルのみ（ベースとのマージベースから作業ツリーまでの差分。未コミット・未追跡を含む。触れたカーネルだけ fan-out）」
     —— コミット済みか否かを問わず、作業ツリーがマージベースと異なるときのデフォルト
   - 「リポジトリ全体（全カーネルを fan-out）」 —— リリースラインの上、または差分が無いときのデフォルト
   - 「特定のカーネルのみ（続けて指定）」
   - 「キャンセル」

2. 「静的検査の結果をどこから取りますか」
   - 「PR の Lint の結果を使う」 —— PR があり、その head が手元の `HEAD` と同じで、作業ツリーが綺麗なときの
     デフォルト
   - 「範囲を絞って手元で 1 回だけ回す」
   - 「取得しない（未取得として監査）」

## Step 1 — カーネルとファイル一覧を解決する

「変更ファイルのみ」のとき:

```sh
BASE=$(gh pr view --json baseRefName -q '.baseRefName' 2>/dev/null || make -s base-branch)
test -n "$BASE" || { echo "ベースブランチを解決できませんでした"; exit 1; }
MERGE_BASE=$(git merge-base "origin/${BASE}" HEAD) || { echo "マージベースを解決できませんでした"; exit 1; }
{ git diff --name-only "$MERGE_BASE"; git ls-files --others --exclude-standard; } | sort -u
```

**差分はマージベースから作業ツリーまでを取る。** コミット済み・未コミット・未追跡の作業がすべて入るので、
コミットせずに書く呼び出し元（`scaffold-slice`）も、書いたばかりのものを監査できる。
**既存の pull request の `baseRefName` が正であり続ける** —— 監査が読むのは、PR が見せている差分と、
その上にまだコミットされていないものである。**ベースかマージベースを解決できなければ続けずに止まる。**
空のファイル一覧は auditor を 1 つも起動せず、それは綺麗な監査とまったく同じに見える。

`src/` の下の変更パスを先頭のセグメントでカーネルへ振り分け、**カーネルの一覧はここに持たず
[`architecture.ts`](../../../architecture.ts) の `KERNELS` から読む。** 差分全体の一覧も残す ——
それが `diffFiles` である。

各カーネルの一覧から、どの行も監査しないものを外す。

- テストファイル（`*.test.ts` / `*.test.tsx`）
- 生成物 —— どのパスでも `git check-attr linguist-generated -- <path>` が答える
- 削除されたパス —— `diffFiles` には残し、カーネルの一覧からは外す

**`README.md` が変わったカーネルは、差分が他に何を触ったかに関わらず全体を監査する。** 表が変われば
基準が変わっており、差分が触っていないファイルもその基準で裁かれる。報告にそう書く。

どのカーネルにも属さない `src/` の下の変更パス（`src/proxy.ts` / `src/instrumentation.ts`）には専用の
auditor を立てない。それらに関わる行は、それらが import するカーネルに在り、そのカーネルの auditor が
探しにいく。「変更ファイルのみ」でカーネルの変更が無ければ、そう述べて正常に終える。

「リポジトリ全体」のときは `KERNELS` の全カーネルを全ファイルで。「特定のカーネルのみ」のときは名指された
カーネルを全ファイルで。

## Step 2 — 静的判定を 1 度だけ決める

ゲートの出力は `tmp/arch-check/`（追跡外）へ保存してそのパスを渡す。行を落とすフィルタ越しに auditor が
読むことが無いようにするためである（[0157](../../../docs/adr/0157-inspection-declaration-discipline.ja.md)）。

- **PR の Lint の結果。** `Lint` workflow（[`.github/workflows/lint.yaml`](../../../.github/workflows/lint.yaml)）
  は `pnpm lint:ci` —— biome・ESLint・`pnpm check:architecture` —— を回し、ログ全体を
  `<!-- lint-result -->` の印を持つ PR コメントとして上書きする。使ってよいのは、PR の現在の head に
  対するその workflow の実行が終わっていて、head が手元の `HEAD` と同じで、in-scope のファイルに未コミット・
  未追跡の変更が無いときだけである。そうでなければその判定は別の木のものである。判定はその実行の `緑` / `赤`、保存するファイルはコメントの本文。
- **範囲を絞った手元の実行。** `pnpm check:architecture` を 1 回、`pnpm exec eslint` を in-scope の
  ファイル（full スコープならカーネルのディレクトリ）に対して 1 回。それぞれの終了コードを記録する。
  判定が `緑` になるのは両方が 0 で終えたときだけ。
- **取得しない。** `未取得` を渡す。auditor が中継するはずだった行はすべて未検証として報告され、締めの
  報告にもそう書く。

## Step 3 — auditor を並列に fan-out する

in-scope の各カーネルについて **Agent tool** で `arch-auditor` を起動し、**1 メッセージに複数の tool 呼び出し**
として並べて並行に走らせる。それぞれへ渡すもの:

- `layer` —— カーネル名
- `files` —— Step 1 で解決したファイル一覧
- `scope` —— `changed` か `full`（README が変わったカーネルは `full`）
- `baseRef` —— ベースブランチ
- `diffFiles` —— `changed` スコープのときだけ。差分全体の一覧
- `staticVerdict` —— Step 2 の判定と、保存した出力のパス

**full スコープで `model` が in-scope のとき**は、同じメッセージへ `type-design-reviewer` の呼び出しを
1 つ足す。`scope=full`、`model` のファイル一覧、同じ `staticVerdict` を渡す。その基準は
[`impl-review/prompts/type-design.md`](../impl-review/prompts/type-design.ja.md) が持ち、このスキルは読みも
書き直しもしない。changed スコープでは回さず、報告にそう書く。

各 agent の最終メッセージが**そのまま**所見である。カーネル名を付けて集める。

> 現在の環境で agent を起動できない場合は、カーネルごとに `prompts/audit-layer.md` をインラインで
> 実行する。

## Step 4 — 集約して報告する（日本語）

```text
arch-check 統合結果（スコープ: <scope>, 静的検査: <緑 | 赤 | 未取得>（出所: <PR の Lint | 手元 | 未取得>））

[<kernel>] violations <N> / suggestions <K>（対象 <n> ファイル。README 変更のため全体 のときはそう書く）
  観点の網羅: <欠けたタグ、または なし>
  ...（各 auditor の所見をそのまま）

[type-design] <件数、または「スコープが changed のため未実行」>

総計: violations <sum>, suggestions <sum>, 観点の欠け <sum>
未検証: <静的検査を未取得にしたために確かめられなかった行>
対象外: <スコープから外れたカーネル / auditor を持たないパス>
```

**綺麗な報告はスコープを名乗る。** 全 auditor が空で返ったときは、監査したカーネルを並べる —— 並べない
報告は、何も fan-out しなかった実行と見分けが付かない。

`[観点の網羅]` の所見はコードではなく README に対する所見である。合計ではコードの violation と分けて
持ち、「コードが規則を破っている」と「表に規則が欠けている」を読み手が区別できるようにする。

## Step 5 — 引き渡す

報告が成果物である。**このスキルはソースにも README にも PR にも書かない。** pull request を所有する
呼び出し元（`impl-issue` / `submit-pr`）が求めたときは、その呼び出し元を通して報告が PR 本文へ入る。
violation を直すこと、suggestion を裁くこと、README の表を育てることは user のものである。

## AI Modification Scope

このスキルの起動が `AGENTS.md` の変更範囲を緩めるのは、実行のあいだの **`tmp/arch-check/` だけ**である。
ソース・README・ADR・`docs/rules.md`・PR は触らず、`.claude/settings.json` の `permissions.deny` の下に
あるものも同じ。auditor は何も書かない。

## Do / Do NOT

- ✅ 何かを読む前に、スコープと静的判定の出所を 1 度で確かめる。
- ✅ ベースは `commit` / `submit-pr` と同じ方法で解決し、解決できなければ止まる。
- ✅ カーネルの一覧は実行時に `architecture.ts` から読む。
- ✅ 静的判定は 1 度だけ決め、全 auditor に同じものを渡す。
- ✅ auditor は 1 メッセージで fan-out して並行に走らせる。
- ✅ README が変わったカーネルは全体を監査する。
- ✅ 監査したカーネルを名乗る —— 綺麗な実行のときこそ。
- ✅ 日本語で報告する。
- ❌ auditor にゲートを回させる、あるいはカーネルごとにゲートを回す。
- ❌ auditor を 1 つずつ起動する。
- ❌ README の規則や `prompts/audit-layer.md` の基準を、このファイルに書き直す。
- ❌ changed スコープで `type-design-reviewer` を回す。
- ❌ `未取得` を綺麗として報告する。
- ❌ ソース・README・コメント・PR へ書き込む。
- ❌ commit や push をする。

## Checklist

- [ ] スコープと静的判定の出所を 1 回の `AskUserQuestion` で確かめた。
- [ ] ベースを `baseRefName` / `make base-branch` で解決し、変更ファイルをそのマージベースから作業ツリーまで、
      未追跡も含めて取った。どちらかを解決できなければ止まった。
- [ ] カーネルの一覧を `architecture.ts` から読み、各一覧からテストと生成物を外した。
- [ ] README が変わったカーネルを全体へ広げた。
- [ ] 静的判定を 1 度だけ決め、`tmp/arch-check/` へ保存した。
- [ ] auditor を 1 メッセージで fan-out し、それぞれに `layer` / `files` / `scope` / `baseRef` /
      `diffFiles` / `staticVerdict` を渡した。
- [ ] `type-design-reviewer` は full スコープで `model` が in-scope のときだけ足した。
- [ ] 集約はスコープ・静的判定の出所・未検証のものを名乗っている。
- [ ] `tmp/arch-check/` の外へは何も書かず、commit も push もしていない。
