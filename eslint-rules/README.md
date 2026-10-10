---
test-requirement: unit
---

# eslint-rules

biome が表現できない検査だけを持つ自作 ESLint ルールの置き場
（[0002](../docs/adr/0002-formatter-linter.md) の能力ベース分担）。適用は
[`eslint.config.ts`](../eslint.config.ts) が `project-rules/<ルール名>` として行う。ここに置いた
ルールは `pnpm lint`（biome のみ）では走らず、`pnpm lint:ci` と `pnpm exec eslint <path>` で走る
（[0002](../docs/adr/0002-formatter-linter.md)「Basic Commands」）。

**ルールは検査だけを持ち、規約は持たない。** 何を禁じるかとその理由は `docs/rules.md` の節か層の
README が持ち、ルールの先頭コメントはその所有者を名指す。逆に、所有する側の「enforced via」は
`project-rules/<ルール名>` を名指す（[0144](../docs/adr/0144-decision-enforcement-pairing.md)）。
どちらか一方にしか無い状態は、決定と強制手段が切り離された状態である。

## 置いているルール

| ルール | 検査するもの |
| --- | --- |
| [`no-ad-hoc-cache-tag`](no-ad-hoc-cache-tag.ts) | 捨てる印の段の数（`<資源>` と `<資源>:<識別子>` の 2 段まで）と、印を付ける場所（取得側の `src/adapters/` 1 か所）。資源名が契約の集合名と揃っているかは契約を読まないと決まらないので見ない |
| [`no-anonymous-default-export`](no-anonymous-default-export.ts) | 名前を持たない default export。1:1 ゲートが `describe` で指せる名前を要求する（[0090](../docs/adr/0090-testing-strategy.md)）。通すのは名前付きの関数 / クラス宣言と、識別子への参照の 2 形 —— arrow function を default export できるのは後者だけで、両方を許して初めて書ける形が揃う |
| [`no-app-wide-revalidate`](no-app-wide-revalidate.ts) | アプリ全体を捨てる再検証（`revalidatePath("/", "layout")`）。所有境界ではないので、更新した値がどの画面にも付く外枠に出るときだけの例外とし、`eslint-disable-next-line` に理由を書いて名乗る（[0071](../docs/adr/0071-bff-api-integration.md)）。所有境界そのものの判定は契約と画面を読まないと決まらないので見ない |
| [`no-arbitrary-z-index`](no-arbitrary-z-index.ts) | 重なりの段の任意値（`z-[…]`、負の `-z-[…]` も）。段階値の間に割り込み、どれが上かを画面全体から読まないと決められなくなる |
| [`no-cache-option-in-use-cache`](no-cache-option-in-use-cache.ts) | `use cache` を持つモジュールの `fetch` に渡した `cache` / `next`。内側が切れないぶん、外側が再取得しても同じ古い応答を掴む |
| [`no-captured-bearer-token`](no-captured-bearer-token.ts) | 資格情報の取得口へ渡す掴んだ値。`getBearerToken` は import した口だけ、`bearerToken`（確立中の例外）は囲む関数の引数だけを通す。掴んだ値を渡すと `cookies()` が読まれず、cached scope の防御が黙って外れる（[0112](../docs/adr/0112-data-classification-cache-boundary.md)）。見るのは値を渡す側（object literal のプロパティ）だけで、受け取る側の分解代入は同じ綴りでも通す。テストは対象外 |
| [`no-client-outside-connection-port`](no-client-outside-connection-port.ts) | 接続口（[`architecture.ts`](../architecture.ts) の `CONNECTION_PORTS`）の外で外部 API の client を組むこと。遮断器と再試行の予算は client に載るため、同じ接続先へ分けると劣化の判断が割れる（[0071](../docs/adr/0071-bff-api-integration.md)）。接続先を呼び出しごとに受け取るなど寄せられない箇所は、`eslint-disable-next-line` に理由を書いて名乗る。import の綴りを実ファイルへ解決してから判定するので、client 側の同じ綴りは当たらない。落とすのは組み立ての関数を値として引く形すべて（別名 / 名前空間 / 再 export / 動的 `import()`）で、型だけの import は通す。テストは対象外 |
| [`no-internal-anchor`](no-internal-anchor.ts) | 内部リンクの生の `<a href="/...">`。client 遷移と prefetch を失う |
| [`no-markup-outside-ui-layers`](no-markup-outside-ui-layers.ts) | UI を置いてよい層の外にある DOM マークアップ（[`architecture.ts`](../architecture.ts) の `UI_KERNELS`）。見るのは host 要素（小文字始まり）だけで、Provider の合成や断片は JSX でも通す。指摘は要素ではなく置き場に対するものなので、報告はファイルにつき 1 件。テストは対象外 |
| [`no-raw-font-weight`](no-raw-font-weight.ts) | 太さの直接指定（`font-medium` 等）。書体が持たない段は丸められ強調にならない（[0051](../docs/adr/0051-styling-system.md)、規約は `src/components/README.md`「文字の太さ」）。`font-normal` は打ち消しなので対象外。test と story の除外は `eslint.config.ts` の `ignores` が持つ |
| [`no-user-scoped-in-cached-module`](no-user-scoped-in-cached-module.ts) | サーバへ保存されるキャッシュ（`use cache`）を持つモジュールからの、user-scoped な取得の口の import（[0112](../docs/adr/0112-data-classification-cache-boundary.md) の段 2）。判定はモジュール単位で、import 先とその 1 段先の綴りの宣言を読む。1 段先で client を組む kernel（[`architecture.ts`](../architecture.ts) の `HTTP_CLIENT_FACTORY`）は数えない（綴りが残っていることは `scripts/scope-spelling.gate.test.ts` が見張る） |

## ルールが共有する線引き

ルールごとの検査対象は違っても、判定の置き方は揃えている。新しいルールもこの線に乗せる。

### 静的に決まる綴りだけを見る

**コードの形から決まらないものは見ない。推測して当てない。** 変数で渡した印や経路、式で組んだ
`href` や class、変数で渡した `fetch` の設定、`[識別子]` で組んだ鍵、変数を渡した動的 `import()`
は、綴りがその場で決まらないので判定に掛けない。見ないことは「取りこぼす」ではなく線引きであり、
テストが valid 側で固定する（後述）。

- **文字列リテラルは必ず拾える形である。** class や `href` は文字列としてしか書けないので、リテラル
  と `TemplateElement` を見れば書かれた分は全部拾える。数値・真偽値・`null` も `Literal` として
  訪れるので、文字列かを先に確かめる。
- **式を含むテンプレートリテラルは、判定に要る綴りが `quasis` に残るときだけ読む。** `quasis` だけを
  繋ぐと式が消える —— `` `/${locale}` `` は根 `/` に見え、根でない経路を全体の捨て方と取り違える
  （`no-app-wide-revalidate` は式を含む形を見ない）。逆に区切りの数のように `quasis` 側に残るもの
  は式があっても読める（`no-ad-hoc-cache-tag`）。
- **リテラルの鍵は `[...]` で書かれていても綴りが確定している。** `["getBearerToken"]` を「計算された
  鍵」として通すと、括弧を足すだけで規則を外せる。確定しないのは `[識別子]` のように値が実行時に
  決まる鍵だけである。

### 呼び出しは素の識別子の名前で合わせる

`cacheTag` / `revalidatePath` / `fetch` のような呼び出しは、`callee` が `Identifier` でその名前が
一致するときだけ見る。`cache["cacheTag"](…)` / `cache.revalidatePath(…)` のように名前が式で決まる
形は見ない（上の線引きと同じ理由）。名前だけが同じ別の関数（`addTag` / `revalidateRoute`）を
巻き込まないことと、呼び出しでない参照（`const f = revalidatePath`）を巻き込まないことは、テストが
valid 側で固定する。

### 場所の判定は起点からの相対で、区切りまで見る

`context.filename` は相対でも絶対でも来る。場所で判定するルールは `context.cwd` を起点に
`resolve` / `relative` してから比べ、**区切りまで含めて**比べる。

- 接頭辞だけの一致で内側と見なすと、`src/adapters-legacy/` が `src/adapters/` の内側に見える。
  区画は `resolve(cwd, 区画) + sep` で `startsWith` する。
- ファイル名のどこかで `src/` に一致させると、ワークスペースの中の `docs-viewer/src/` の直下も層に
  見える。層は `relative(cwd, filename)` の先頭で `^src/<層>/` を取る（`\` は `/` へ正規化する）。
- 接続口のように 1 ファイル単位の宣言は、`relative(cwd, filename)` と宣言の等値で比べる。

### 置き場の宣言は `architecture.ts` から読み、写しを持たない

UI を置いてよい層、接続口、client を組む kernel は [`architecture.ts`](../architecture.ts) の宣言を
import して読む。ルールの option（`meta.schema`）や定数へ写すと、宣言が動いたときに片方だけが
古くなる。同じ理由で、分類（user-scoped）のような**宣言そのものを読める**ものは実ファイルの綴りを
読み、一覧を持たない —— その綴りが崩れても lint は何も言わなくなるだけなので、綴りが残っている
ことは別のゲート（`scripts/scope-spelling.gate.test.ts`）が件数ごと主張する。

**2 つ以上のルールが同じ判定を要るなら、その述語は 1 つのモジュールが持つ**
（[`cache-directive.ts`](cache-directive.ts) が例）。片方にだけ綴りが増えて、もう片方が黙って
古くなることを避けるためである。

### モジュール単位の判定は `Program:exit` で決める

`use cache` のように**モジュール全体に掛かる宣言**を条件にする判定は、走査の途中で報告しない。
宣言は式文に置かれた文字列リテラル（`Literal` の親が `ExpressionStatement`）で、関数の中にも
置けるため、import や `fetch` より後に現れる。候補を配列へ集め、宣言の有無を `Program:exit` で
確かめてから報告する。「宣言より前に書かれた形も挙げる」をテストが固定する。式文の直下に来る
リテラルは宣言だけではない（`42;` も同じ位置に立つ）ので、文字列かを先に確かめる。

### 報告する位置

- **`eslint-disable-next-line` が効くのは宣言の先頭行だけ**なので、抑止で名乗ることを許す指摘は、
  指定子ではなく宣言そのものに出す。
- **置き場に対する指摘はファイルにつき 1 件**に留める。要素ごとに出すと、直す先が 1 つなのに
  指摘が要素の数だけ並ぶ。
- メッセージは「何を渡さない / 書かないか」「そうすると何が起きるか」「代わりに何を使うか」の 3 つ
  を持つ。禁止だけを告げるメッセージは、直す側が規約の所有者を探しに行くことになる。

### 例外の名乗り方

ルールが見ない判断（例外が正当か）は人に残る。例外は `eslint-disable-next-line project-rules/<ルール名>`
にその行で理由を書いて名乗る。専用の綴りを作らないのは [`docs/rules.md#comments`](../docs/rules.md#comments)が独自の
接頭辞を禁じているためで、効いていない抑止は `reportUnusedDisableDirectives` が落とす
（[`eslint.config.ts`](../eslint.config.ts)）。

### テストと story の除外

テストは取得口や組み立ての振る舞いを確かめる側で、hook を回すために wrapper を描くこともある。
これらは束や層の担う UI ではないので、そのルールの検査対象から外す。除外の置き場は 2 つあり、
理由が置き場を決める。

- **理由がルール自身のもの**（テストはこの検査が守る束に載らない）なら、ルールの中で
  `context.filename` を見て外す。
- **理由が対象の種類のもの**（story は見本で画面が使う class ではない、など）なら、
  `eslint.config.ts` の `files` / `ignores` で外し、理由もそこに書く。ルールは全ファイルに当たる
  形のまま置く。

## 別のファイルを読むとき

import の先を判定材料にするルールは、綴りではなく**実ファイルへ解決してから**判定する。server 側
と client 側の要求境界のように、同じ相対の綴りが別の実ファイルを指すことがあるためである。

- [`module-resolution.ts`](module-resolution.ts) の `resolveModule(specifier, filename, cwd)` が、
  別名（`@/`）と相対の綴りを `.ts` / `.tsx` / `/index.ts` / `/index.tsx` の順で実ファイルへ解決する。
  素の package 名は解決しない —— 依存パッケージは読む宣言を持たないうえ、解決に `node_modules`
  の探索が要る。解決できない綴りは判定材料を持たないので通す。
- **相対の綴りは、綴りを書いたファイルを起点に解決する。** 1 段先を読むときは、1 段目の実ファイルを
  `filename` に渡す。lint 対象のファイルを起点にすると、1 段先の相対 import が届かない。
- **lint の対象でないファイルは ESLint が構文木を渡さない**ので、`moduleSpecifiers(source)` が
  `typescript` の字句解析（`ts.preProcessFile`）で綴りを拾う。静的な `import` / `export … from`、
  副作用だけの `import "…"`、動的な `import("…")` を拾い、コメントと文字列の中の綴りは拾わない。
- `importKind` / `exportKind`（型だけの import / export）は TypeScript の構文木にしか無く、ESLint
  の型（estree）は持たない。`Reflect.get` で読む。
- 束縛の種類（import された口か、囲む関数の引数か）で判定するときは、`context.sourceCode.getScope(node)`
  から `upper` を辿って変数を探し、`defs[].type`（`ImportBinding` / `Parameter`）を見る。渡す口は
  モジュール直下で import され、渡す側は関数の中に居るため、手前の scope だけでは全部を取りこぼす。

辿る深さは、その段の役目に見合う範囲で切る。1 段先までで止め、それより深い経路は framework の
防御と取得時の関門に任せる、という切り方が `no-user-scoped-in-cached-module` の例である。

## テストの責務

frontmatter の `test-requirement: unit` はルール本体に掛かる。ルールは判定を 1 つ間違えると
**「検査対象があるのに 0 件で緑」**に倒れ、壊れたことが誰にも見えない。だから
[0090](../docs/adr/0090-testing-strategy.md) はここをカバレッジの母数から外さず、違反する側と
違反しない側の両方を各ルールのテストが持つ。

### テストの形

- ESLint の `RuleTester` を `typescript-eslint` の parser で組む。JSX を読むルールは
  `parserOptions.ecmaFeatures.jsx` を立てる。
- 最外の `describe` は default export の名前（camelCase）。`// ----- 正常系 -----` /
  `// ----- 異常系 -----` で区切り、`it` ごとに `ruleTester.run` を 1 回、`valid` か `invalid` の
  片方だけを持つ。error は `messageId` で照合する。
- 場所で判定するルールは `filename` を渡して行使する。接続口のような宣言は `architecture.ts` から
  import して回し、写しを持たない。
- 検査対象のコードは文字列で渡すので、テンプレート記法を含むコードは `["…`$", "{x}`…"].join("")`
  のように分けて組む。
- 実ファイルへ解決するルールのテストは、リポジトリに実在するモジュールを fixture にする（宣言を
  読ませるためで、写しを作らない）。fixture に選んだモジュールが動くとテストが落ちるので、
  選んだ理由（分類を宣言している / していない / 1 段先だけが宣言している）を定数のコメントに書く。

### 固定する観点

各ルールの `invalid` は違反の形を、`valid` は次を持つ。「見ない」線引きは、テストが valid 側で固定
して初めて意図になる。

- 綴りが静的に決まらない形（変数・式・計算された鍵・動的な綴り）
- 名前だけが同じ別の関数、呼び出しでない参照、呼び出しの名前が式で決まる形
- 文字列でないリテラル（数値・真偽値・`null`・正規表現）
- 場所で判定するなら、接頭辞だけが一致する隣の区画と、絶対パスで渡された `filename`
- モジュール単位で判定するなら、宣言より前に書かれた形と、関数の中の宣言（`invalid` 側）
- 対象外にした種類（テスト、`use cache: private`、型だけの import）

## 足すとき

1. まず biome で表現できないことを確かめる。表現できるものを ESLint 側へ足すのは
   [0002](../docs/adr/0002-formatter-linter.md) が禁じており、確認結果は PR 本文へ書く。
2. 規約の所有者を決める。`docs/rules.md` の節か層の README がまだ持っていないなら、先にそこへ書く。
   ルールの先頭コメントはその所有者を名指し、所有者側の「enforced via」は
   `project-rules/<ルール名>` を名指す。
3. `eslint-rules/<ルール名>.ts` に `Rule.RuleModule` を default export する。`meta.type` は
   `"problem"`、`docs.description` は一文、`messages` は messageId ごとに上の 3 つを持つ日本語。
   置き場の宣言は `architecture.ts` から読む。
4. 同じ名前の `.test.ts` を隣に置き、上の観点を固定する。
5. [`eslint.config.ts`](../eslint.config.ts) の `project-rules` plugin へ登録し、`src/**` の block で
   `"error"` にする。対象の種類で除外が要るなら、別の block を `files` / `ignores` 付きで足し、
   理由をそこに書く。
