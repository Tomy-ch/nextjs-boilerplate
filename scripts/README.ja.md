> **このファイルは [`README.md`](README.md) の日本語訳です。**
> 直接編集しないでください。変更は英語の canonical な `README.md` を先に更新し、そのうえでこの日本語訳を同期してください。
> エージェントが読むのは `README.md` だけです。このファイルは人間が読むための翻訳です。

# scripts

リポジトリを検査・生成・操作する道具を置く。アプリの振る舞いではないので、suite も CI のジョブも
アプリ本体と分けてある。設定は [`vitest.scripts.config.ts`](../vitest.scripts.config.ts)。

## 負う観点

**`unit`。**値を渡して答えを確かめる。ここに居るのは lint とゲートそのもので、壊れると「違反なし」を
報告する向きに倒れる。だから見るのは分岐が実行されたかではなく、**その分岐に固有の結果が出ているか**
である（[testing-conventions](../docs/testing-conventions.ja.md)）。カバレッジは 100% を課しているので、
数字の側は情報を持たない。

外から来る文書を読むモジュール（Playwright のレポート、`git` の出力、レジストリの応答）は、**形が
崩れた入力を観点に含める。**0 件へ縮退させると「失敗なし」と読めてしまう。

**パスを接頭辞で判定する関数は、接頭辞だけ一致する隣を観点に含める。**`a/b` の内側かを
`startsWith("a/b")` で見ると `a/bc` も内側になる。区切りまで見る実装は正しく書かれていることが
多いが、**無関係なパスを渡すテストではその区切りを 1 度も踏まない**ので、区切りを落としても緑の
ままになる。ここで扱うパスは削除・除外・突き合わせの対象なので、誤判定は消してはいけないものを
消す向きにも、消すべきものを見逃す向きにも倒れる。

**隣を渡すだけでは、先頭の固定（`^`）までは踏めない。**`a/bc` は `a/b` で始まってはいるが、
`a/b` を**内側に**は含まない。先頭の固定を落とした実装を捕まえるのは、接頭辞そのものが文字列の
途中に現れる入力（`xa/b`）である。隣と埋め込みは別の変異を殺すので、両方を観点に持つ。

**組んだ文字列が GitHub 上で公開に読まれるモジュールは、無害化を観点に含める。** issue の本文や
PR のコメントへ載る文字列は、このリポジトリが書いていない散文（抑止の理由、道具の出力）を含む。
生の連結で組むと、mention や偽のリンクが CI の名義で公開の面に載る。該当するモジュールは
[`lib/issue-body.ts`](lib/issue-body.ts) のような共有の窓口を通し、**このリポジトリが書いていない
散文を注入しても記法として解釈されない**ケースを 1 つ持つ。判定の基準は「その文字列の読み手が
GitHub 上の公開の面か」であって、モジュールの置き場ではない。

**読み手がシェルへ貼る値は、文字集合で落とす。** コピー用のコマンドへ差し込む値（ブランチ名・id の
並び・実行の id）が [`lib/accepted-chars.ts`](lib/accepted-chars.ts) の許す集合を 1 文字でも外れたら、
無害化して通すのではなく**そのセクションごと出さない**。案内だけを残すと、読み手は在るはずのコマンドを探す。

**機械が読む出力（`$GITHUB_OUTPUT`）へは、改行を含む値を均さずに落とす。** 行の区切りがそのまま
意味の区切りなので、外から届いた値の改行は後続のステップが読む値を差し替える経路になる。記録なら
偽の 1 行に読み手が気付けるが、機械は「正しく読めた」として先へ進む
（[`lib/github-output.ts`](lib/github-output.ts)）。

## エントリポイントの形

`index.ts` が担うのは引数の受け取り・外との遣り取り・終了コードで、それ無しでも下せる判定は隣の
モジュールに置く（[0159](../docs/adr/0159-script-structure.ja.md)）。その上で、エントリポイントどうしが揃えている形。

- **冒頭のコメントに、サブコマンドの一覧と、判定を持つモジュールの名前を書く。** エントリポイントを開いた
  読み手が次に開くファイルを、そこで答える。
- **stdout は答え、stderr は案内。** `$(make -s <target>)` で受けられるよう、stdout には受け取る側が
  読む値だけを出す（ブランチ名 1 行、パスを 1 行 1 件、markdown の本文）。
- **終了コードは 3 つに分ける。** 0 は違反なし、1 は違反あり、**2 は検査が成立していない**
  （宣言が読めない・スキャン対象が 0 件・公開日時を引けない・base を取れない）。1 と 2 を分けるのは、
  0 件を「違反なし」へ寄せないため（[0157](../docs/adr/0157-inspection-declaration-discipline.ja.md)）。
  「対象が無い」（差分に動いた pin が 1 件も無い）は成立した検査の 0 件なので、0 で終わる。
- **エージェントの hook から呼ばれる道具は、逆向きに倒す。** 判定できないとき（設定が読めない・
  依存が無い・ペイロードが壊れている）は通す。「塞ぐ対象が分からない」は「塞ぐ対象が無い」では
  ないが、そこで止めると環境が整う前のあらゆる呼び出しが止まる。通してよいのは、前方一致の宣言
  （`permissions.deny`）が別に効いているからである。呼び出しごとに走るので `tsx` を経由せず
  `node scripts/<tool>` で直接起動する —— 起動が丸ごと待ち時間になり、Node の型ストリップで足りる。
  `.ts` 拡張子付きの import が要るので、そのディレクトリだけが `tsconfig.json` を持つ。
  `allowImportingTsExtensions` を root へ動かさない —— 生成器がそれを読み、生成物まで拡張子付きの
  import を吐く。
- **外から来る値は引数ではなく環境変数で受ける**（ブランチ名・git ref・書き出し先）。make の
  recipe 行へ展開させないためで、理由は [`.makefiles/README.md`](../.makefiles/README.ja.md) と
  [`docs/rules.ja.md`](../docs/rules.ja.md#generated) が持つ。
- **`--name value` の並びは [`lib/cli-options.ts`](lib/cli-options.ts) で読む。** 読み方は遣り取りを
  伴わないので判定の側に置き、崩れた並びは throw する。案内の文面と終了コードは道具ごとに
  `usage` が違うので、エントリポイントが持つ。初期化ツール群の `--dry-run` / `--help` は
  [`setup/lib/runtime.ts`](setup/lib/runtime.ts) が読む。
- **例外の文面を人へ出す行は [`lib/error-message.ts`](lib/error-message.ts) を通す。** 文言を持たない
  `Error` と `Error` でない値の扱いを道具ごとに書くと、「空行だけが出る」「`[object Object]` が出る」
  の差が生まれる。改行と制御文字は空白へ均す —— 外から来た応答が偽の 1 行を記録へ足せる。落とす
  2 文字は集合ではなく literal で名指しする。スキャンする側は、落としている文字を綴りから読む。
- **固定（pin）を扱う道具は、解決・反映・検査の 3 段に揃える。** ネットワークへ出るのは解決
  （`resolve`）だけで、ロックファイルを書く。反映（`apply`）はロックファイルを正として対象を書き換え、
  検査（`check`）は反映と同じ判定を書き換えずに行って非ゼロで終わる（hook / CI 用）。digest や SHA を
  人がコピーする工程は作らない。読み書きは [`lib/pin-lockfile.ts`](lib/pin-lockfile.ts)、公開から日の浅い
  解決先を採らない検疫は [`lib/pin-quarantine.ts`](lib/pin-quarantine.ts) が持ち、固定する対象ごとに
  違うのはキーと値の文法と、経過日数の調べ方だけである。ロックファイルは `"<key>" = "<value>"` の
  行だけの TOML の部分集合に限り、パーサを入れずに自前の正規表現で読み書きする —— 書く側と読む側が
  同じ制約を共有していれば依存なしで往復でき、想定外の構文が紛れ込む余地も消える。壊れた行は
  読み飛ばさず、キーの重複は通さず、キー順で書き出す。
- **基準値を持つゲートには、人が引き直すエントリポイントを付ける**（`--write`）。人が更新できないゲートは、
  赤を消すために検査のほうを外す圧力を生む。引き直しで黙らせてよいのは「数が動いたら判断せよ」
  という種類の検査だけで、0 件が唯一の合格である検査は引き直しの対象にしない。
- **取り消せない一括処理と、段階を踏む生成は、1 件目に触る前に止まる形にする。** 宣言どうしの
  整合を先に確かめ、導出できない入力に出会ったら書きかけを片付けようとせず、そこで理由を出す ——
  1 ファイルも書いていない時点で止まるので、ロールバックは要らない。処理の後に消えているかも
  しれないモジュールは import ではなく子プロセスの CLI で呼ぶ（[`docs/rules.ja.md`](../docs/rules.ja.md#generated)
  ）。

## 判定モジュールの形

- **入出力は文字列と構文木で、fs とプロセスを持たない。** 実在の確認や README の読み取りが要る
  なら、`exists` / `ReadmeReader` のような述語を引数で受ける。テストは述語を差し替えるだけで、
  ツリーを作らずに済む。
- **`lib/` が持つのは「読み方 / 当て方」で、呼ぶ側が持つのは「一覧 / 綴り」。** 差分のパスへ規則を
  当てる判定は [`lib/path-rule.ts`](lib/path-rule.ts) が当て方を持ち、当てる一覧と理由は勧める側と
  回す側がそれぞれ持つ。分割実行の結果が全台ぶん揃ったかは
  [`lib/shard-completeness.ts`](lib/shard-completeness.ts) が判定を持ち、名前から台数を読む綴りは
  名前を付けた側が持つ —— 綴りを共有側が覚えると、名前の付け方を変えたときに黙って古びる。
- **同じファイルを 2 通りに読まない。** frontmatter・`mise.toml` の pin・workflow 定義・composite
  action の定義・`git diff --numstat`・YAML のブロックスカラーは読み手が複数あるので、読み方は
  `lib/` の 1 箇所が持つ。2 通りの読み方が並ぶと、片方だけが書式に追従できなくなり、追従できない
  側の検査だけが黙って壊れる。
- **追従する相手が違うものは、別のモジュールに分ける。** TypeScript の字句構文を追うスキャン
  （[`lib/string-literals.ts`](lib/string-literals.ts)）と App Router の route 規約を追う判定
  （[`lib/e2e-routes.ts`](lib/e2e-routes.ts)）、GitHub の slug 規則を追う
  [`lib/markdown-anchor.ts`](lib/markdown-anchor.ts) とリンクの拾い方を持つ
  [`lib/doc-links.ts`](lib/doc-links.ts) は、それぞれ別の理由で動く。
- **外から来る JSON は、キーの名前を実物の型から導き、値は信用しない。** `{ [K in keyof T]?: unknown }`
  の形で受ける（[`lib/playwright-report.ts`](lib/playwright-report.ts)）。キーを手でコピーすると実在しない
  キーを宣言でき、型に守られているつもりのまま常に空を読む。形が崩れていれば throw する —— 0 件へ
  縮退させると「失敗なし」と読める（[`docs/rules.ja.md`](../docs/rules.ja.md#generated)）。
- **パーサに任せる値と、生の行から取る位置・コメントを併用するときは、両方で数えた件数を突き合わ
  せる。** コメントは構文木に残らないので、免除や理由をコメントに持つ宣言はパーサだけでは読めない。
  生の行の読み方が壊れたまま 0 件へ縮退すると、免除の無い宣言として通る
  （[`lib/mise-pins.ts`](lib/mise-pins.ts)）。
- **対応を突き合わせる検査は両方向を見る。** export と describe、除外の宣言と README の記録、
  route と仕様書、spec が指す経路と実在する route —— 片方向だけだと、消した側の残骸（テストだけが
  残った状態、画面を消して約束だけが残った状態）が検査をすり抜ける。「実在しないことが意図である」
  例外の宣言も同じ規律で、どの spec も指していない宣言・実在するようになった宣言を stale として
  落とす。例外は 1 箇所に理由と撤去条件つきで集め、書き手の側へ無効化のマーカーを置かない ——
  マーカーはコピーした先へ一緒に渡り、新しい違反が無言で許される。
- **glob は `**` と `*` だけ**（[`lib/path-pattern.ts`](lib/path-pattern.ts)）。汎用の glob 実装を
  採らないのは、受け付ける記法が宣言側の記法より広くなり、書けるが検査されない形が生まれるため
  である。末尾が `**` のパターンは受け付けない —— ディレクトリにだけ当たる正規表現が黙って作られる。
- **Markdown を歩く判定は、コードフェンスとコードスパンを外す。** 書き方そのものを示した例
  （囲んだリンクの形、例示した見出し）を実在するものとして数えない。閉じないフェンスは開きとして
  数えない —— 「そこから先ぜんぶコード」と読むと残りの行が丸ごと無検査になり、見落としは無言で
  ある。スキャン対象は [`lib/markdown-files.ts`](lib/markdown-files.ts) が markdownlint の `ignores` と
  揃えて持ち、除外はディレクトリの段階で判定する。
- **正規表現は、後戻りしない形と、読める形に寄せる。** 捕捉群を添字で読まず
  [`lib/regex-groups.ts`](lib/regex-groups.ts) を通す —— 添字は必ず参加する群でも
  `string | undefined` になり、到達しない分岐が生まれる。括弧の中身を取る・それが対象か見る・
  直後を見る、のように式を分けると、どれも前から 1 度読むだけで済む。

## リポジトリ全体を歩くゲート

`scripts/*.gate.test.ts` は判定を `lib/` に置き、ゲートはスキャンと型解決だけを担う。主語を持たない
ので [`lib/untested-modules.ts`](lib/untested-modules.ts) の `SUBJECTLESS_TESTS` に宣言してある。

- **違反より先に「見た件数」を主張する。** スキャンが空振りすると、違反ゼロを報告したままゲートが
  黙る。下限は実数より十分低く採る —— 守るのは縮退であって増減ではない。型解決が要るゲートは、
  解決できなかった import（TS2307）を違反より先に主張する —— 依存が解決できないと `any` になり、
  呼べる export が呼べないものとして扱われる。
- **スキャン範囲を狭めて時間を縮めない。** 縮めた分だけ無検査の範囲が増える。時間は明示の timeout で
  受ける（[testing-conventions](../docs/testing-conventions.ja.md)「リポジトリ全体をスキャンするゲート」）。
- **`git ls-files` は index であってツリーではない。** 剥がした後のツリーでは index に居るのに消えている
  ファイルが在るので、実在するものだけを採る。縮退は下限が見張る。

## 検査から外すもの

宣言は [`lib/untested-modules.ts`](lib/untested-modules.ts) が持ち、カバレッジの母数と 1:1 ゲートが
同じ配列を読む。エントリポイントファイル・契約からの生成物・判定を持たないモジュール・テスト専用の組み立て・
カタログ専用の差し替え・単体では回せない route segment・それ自体がテストであるモジュールの 7 つに
分け、それぞれ理由と撤去条件を添えてある。主語を持たないテストファイルは同じ場所の
`SUBJECTLESS_TESTS` へ理由付きで宣言する。**外すのは検査が意味を持たないものだけ**で、「いまは
書けていない」は理由にならない。除外の並びは所有する README の frontmatter `coverage-exclusions`
にも記録し、宣言と記録の食い違いは両方向でゲートが落とす。

<!-- boilerplate-only:begin -->
## 撤去マーカーを足したら数え直す

`sample` / `boilerplate-only` の撤去マーカーは、**発火してほしい本物**と、**規約を説明するための
例示**とが同じ形をしている。位置でも構文でも区別は付かないので、除去側は「例示だ」という宣言
（`setup/remove-sample/sample-manifest.ts` の `MARKER_LITERAL_FILES` と、スキャンから外す接頭辞）を持つ。
宣言を忘れたときに起きることは 2 通りで、対応の取れないマーカーなら除去が中断して声が出るが、
**閉じたペアを散文が持っていると、その区間は例外を出さずに消える**。空になったコードフェンスは
有効な Markdown のままなので、撤去後のツリーを lint しても鳴らない。

そこで [`marker-baseline/`](marker-baseline/) がファイルごとのマーカー行数を
[`baseline.json`](marker-baseline/baseline.json) に固定し、[`marker-baseline/scan.test.ts`](marker-baseline/scan.test.ts)
が実ツリーと突き合わせる。マーカーを足した / 消した瞬間にしかこの数は動かないので、区間の中の散文を
直しても差分は出ない。数が動いたら、そこが判断の場になる。

同じエントリポイントが**表として成立していない行**も見る。Markdown の表は表の行でない行に出会った時点で終わる
ので、コメント**行**を表の途中へ置くと、それ以降の行が表から落ちて生のパイプを含む段落になる。
行内で完結する `:line` はセルに納まるので安全だが、`begin` / `end` / `replace-*` は行を占めるため
表を割る。**表は 1 行 1 実体にし、消える実体は自分の行を持って `:line` で落とす。**

部分置換のために `replace` で 1 行を囲むと、変えたいのが数文字でも行が丸ごと退避側へ複製される。
退避側は誰も読まないコメントなので、先に腐るのは必ずそちらである。こちらは行数と違って基準値を
持たない —— 0 件が唯一の合格で、数えて固定する対象ではない。

除去する側（サンプル破棄・boilerplate 限定セクションの剥がし）はどれも一度きりで自消滅するので、マーカーを
取り除く機構はどちらの中にも置かず、[`setup/lib/markers.ts`](setup/lib/markers.ts) が持つ。規則を
どれかの中に置くと、先に消えた方と一緒に消える。マーカーはコメント（`//` / `#` / `<!-- -->`）に
書く前提で、文字列リテラルや本文の同じ綴りは拾わない。

- 本物のマーカーを足した / 消した → `pnpm exec tsx scripts/marker-baseline --write` で引き直す
- マーカーの形を**指示ではなくデータ**として書いた → 引き直す前に除去側へリテラルとして宣言する

### 破棄後に残る題材の語彙を、一度きり棚卸しする

残留語彙の検査（`setup/verify-sample-removal/`）がスキャンするのは `src/` と `mocks/` の
`.ts` / `.tsx` だけである。**登録漏れはその外側に出る** —— 抑止ファイルや設定ファイルが破棄される
パスを指したまま残っても、検査は緑のままになる。

スキャン範囲を広げる形では解けない。追跡下の全ファイルへ掛けると、多義語（「在庫」は作業の残量、
「問い合わせ」は照会）が題材と無関係な箇所へ当たり、鳴った件数のほとんどが誤検出になる。

代わりに、**破棄の登録を変えたときだけ**次を一度きり回して、出た行を 1 件ずつ裁く。

```bash
# 破棄されるパスを指したまま残る行を洗い出す（判定は人が行う）
git grep -niE "$(pnpm exec tsx -e 'import {DANGLING_PATTERN} from "./scripts/setup/remove-sample/sample-manifest.ts"; console.log(DANGLING_PATTERN)')" \
  -- ':!src' ':!mocks'
```

出た行の行き先は 2 つしかない。**破棄と一緒に消えるべきなら登録する**（マーカーか、
`SAMPLE_PATHS` への追加）。**残る側が持ってよい語なら、題材の語彙を落として書き直す。**

<!-- boilerplate-only:end -->

## 実行

| コマンド | いつ |
| --- | --- |
| `make scripts-test-cached` | pre-commit |
| `make scripts-test` | pre-push / CI（`scripts-check`）。カバレッジ 100% を課す |

## 関連する ADR

ここに居る道具が自分の運用で従う決定と、ゲートが `src/` に代わって強制している決定。

- [0010](../docs/adr/0010-standards-and-non-lockin.ja.md) — 送り先を特定の SaaS へ縛らない書き出し
- [0011](../docs/adr/0011-no-docker.ja.md) — container image の参照を持つ面の責務線
- [0021](../docs/adr/0021-frontend-responsibility.ja.md) — レイヤー README の frontmatter と依存の突合
- [0024](../docs/adr/0024-adapters-server-client-split.ja.md) — server 専用を綴りではなく置き場で表す
- [0025](../docs/adr/0025-app-layer-elements.ja.md) — app レイヤーの要素の別と、要素ごとに許す依存
- [0027](../docs/adr/0027-directory-structure.ja.md) — 生成物の配置と、規約上の配置を指す表記
- [0028](../docs/adr/0028-naming-convention.ja.md) — 生成対象の名前
- [0029](../docs/adr/0029-type-design-discipline.ja.md) — client へ届くスキーマのエントリポイント
- [0030](../docs/adr/0030-environment-variable-management.ja.md) — `process` の直読と server 番人の位置
- [0043](../docs/adr/0043-middleware-policy.ja.md) — 起動 / 境界エントリの分類
- [0054](../docs/adr/0054-ui-catalog-storybook.ja.md) — カタログ専用の差し替え
- [0071](../docs/adr/0071-bff-api-integration.ja.md) — build が要る取得先と、生成 client を使わない判断
- [0072](../docs/adr/0072-api-type-generation.ja.md) — 生成物へ検査を課さない判断
- [0090](../docs/adr/0090-testing-strategy.ja.md) — レイヤー別責務表 / 1:1 対応 / 除外の規律
- [0091](../docs/adr/0091-test-verification-methods.ja.md) — 実ブラウザが負う観点と、単体で回せない範囲
- [0101](../docs/adr/0101-performance-budget.ja.md) — 予算の割り方と、測る指標
- [0102](../docs/adr/0102-browser-support.ja.md) — 数える対象を決める browserslist
- [0110](../docs/adr/0110-security-operations.ja.md) — 監査のしきい値 / 抑止の撤回条件 / SAST のルール集合
- [0112](../docs/adr/0112-data-classification-cache-boundary.ja.md) — 取得エンドポイントが綴る分類
- [0113](../docs/adr/0113-development-access-surface.ja.md) — 開発用のエンドポイントを build から外す線
- [0141](../docs/adr/0141-portal-operations.ja.md) — portal の URL と差し替えマーカーの族
- [0143](../docs/adr/0143-spec-driven-development.ja.md) — route と画面要件の存在の突合
- [0146](../docs/adr/0146-rule-reference-stability.ja.md) — 規約をセクションのアンカーで指す / 集計を手で数えない / 判定の 3 語
- [0150](../docs/adr/0150-git-workflow.ja.md) — ブランチ命名 / 昇格の連なり / バージョンの出所
- [0151](../docs/adr/0151-git-hooks.ja.md) — ローカルゲートのバンドと bypass の可否
- [0152](../docs/adr/0152-agents-md-policy.ja.md) — 本文言語とミラーペアの運用 / boilerplate-only マーカーを独立させる理由 <!-- boilerplate-only:line -->
- [0153](../docs/adr/0153-ci-configuration.ja.md) — job の分割 / SHA ピン / 公開の面へ出す文字集合
- [0154](../docs/adr/0154-claude-skills-operations.ja.md) — 外部スキルの導入手順（`bootstrap-external-skills`）
- [0155](../docs/adr/0155-claude-skills-development.ja.md) — 公式プラグインから採る資産と採らない資産（`bootstrap-plugins`）
- [0157](../docs/adr/0157-inspection-declaration-discipline.ja.md) — 成立しない検査を「違反なし」へ倒さない
- [0159](../docs/adr/0159-script-structure.ja.md) — 1 道具 1 ディレクトリ / エントリポイントと判定を分ける / export と test の 1:1
- [0160](../docs/adr/0160-agent-environment-loop.ja.md) — 打刻と記録から稼ぎを測る機構
- [0161](../docs/adr/0161-development-window-as-feedback-unit.ja.md) — ウィンドウを単位に測るという取り方
