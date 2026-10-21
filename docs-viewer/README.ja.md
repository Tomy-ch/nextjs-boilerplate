> **このファイルは [`README.md`](README.md) の日本語訳です。**
> 直接編集しないでください。変更は英語の canonical な `README.md` を先に更新し、そのうえでこの日本語訳を同期してください。
> エージェントが読むのは `README.md` だけです。このファイルは人間が読むための翻訳です。

# docs-viewer

ドキュメントポータルのビューアーです。アプリ本体とは**別パッケージ**で、Next.js のランタイムには
乗らず、静的サイトとして単体でビルドされて GitHub Pages へ配信されます
（[ADR 0141](../docs/adr/0141-portal-operations.ja.md)）。

読み込む `docs.json` は生成物で、`docs/portal/manifest.yaml` を単一ソースとして `scripts/portal/`
が組み立てます。ビューアーは内容の出所を持たず、生成物をレンダリングするだけです。ビルドのエントリポイントはルートの
`pnpm portal:build` で、生成とビューアーのビルド（`pnpm --filter docs-viewer build`）を続けて回します。

## なぜ別パッケージなのか

**無害化の許容範囲が違うからです。** アプリ本体が扱うのは利用者が投稿する内容で、
[`model/rich-text`](../src/model/rich-text/README.ja.md) の allowlist は `table` も `pre` も `class`
属性も通しません。それが設計意図です。

一方このビューアーがレンダリングするのは、リポジトリ自身が持つコミット済みのドキュメントです。表・コード
ブロック・図が出せなければ用を成しません。同じ repo に広い allowlist と狭い allowlist を並べると、
**広い方をアプリ側から import することを止めるものが規約しか無くなります**。パッケージを分けると、
広い allowlist はアプリから到達できません。分離をパッケージ境界で担保するための構成です。

依存も共有しません。アプリ本体の `package.json` とこのパッケージの `package.json` は別物で、
ビューアーが引いた依存がアプリの供給面に乗ることはありません。境界の宣言は
[`pnpm-workspace.yaml`](../pnpm-workspace.yaml) の `packages` に 2 つを並べることが担います。
逆も成り立ちます —— このパッケージの実行時依存（とその推移的依存）は**公開されるサイトで browser
上を走る**ため、脆弱性の扱いはアプリ本体の実行時依存と同じ重さで見ます。推移的依存のバージョンの固定は
同じファイルの `overrides` が持ちます。

## 本文をレンダリングするまでの経路

1 つの文書は次の経路を通って画面に出ます。各段は 1 ディレクトリに閉じ、段を飛ばす経路を持ちません。

```text
Markdown 文字列
  → HTML 文字列          (markdown/    marked)
  → hast ツリー          (sanitize/    fragment として parse)
  → sanitize 済みのツリー (sanitize/    allowlist で濾す → Value Object)
  → React 要素           (document-content/  ツリーから直接組む。HTML 文字列を経由しない)
  → 図                   (mermaid-diagram/   `pre` 1 要素だけを差し替える)
```

- **sanitize は常に通します。** 配信される Markdown はリポジトリのドキュメントから機械的に組まれた
  ものですが、その前提が崩れたときにレンダリング側が最後の防波堤になります。
- **sanitize 済みであることを型で持ちます。** 構築経路を `SanitizedDocument.from` だけに絞った
  Value Object で、sanitize を通っていない HTML がこの型として流通しえない状態にします。表示側の
  コンポーネントはこの型だけを受け取り、`children` と `dangerouslySetInnerHTML` を props から外します。
  アプリ本体の `RichTextContent` と同じ形ですが受け取る型が違い、**両者を混ぜられない**のが要点です。
- **文字列置換ではなくツリーを検査します。** 仕様準拠の parser でツリーにしてから allowlist を当てるため、
  文字列置換による sanitize で起こる parser の解釈差を持ちません。レンダリングもツリーから React 要素を直接
  作り、HTML 文字列へ戻しません。
- **レンダリング側の判断はツリーの形だけで行います。** 図にするかどうかは `pre > code.language-mermaid` という
  形で決め、レンダリング側が文字列を再度 parse することはしません。再 parse すると、sanitize を通ったツリーと
  レンダリングの判断が別の根拠を持つことになります。差し替えは `hast-util-to-jsx-runtime` の `components`
  で `pre` 1 要素に閉じ、`passNode` で元のセクションを受け取って判定します。
- hast の `className` は型上は配列ですが parser は文字列のまま持つこともあるため、**値の形で受けます**。

### 無害化 schema の決め方

schema は `sanitize/document.definition.ts` が持ち、**このパッケージの外へ出しません**。決め方は
次のとおりです。

- **`hast-util-sanitize` のデフォルト schema へ委ねる項目を残しません。** 未指定の項目はデフォルト値で補完される
  仕様のため、上流のデフォルトが広がったときに通過範囲が黙って広がることを防ぎます。`allowComments` /
  `allowDoctypes` / `clobber` / `clobberPrefix` を含め、全項目を明示します。
- **`h1` を通します。** 面の title が持つのは manifest の項目名であって文書の題ではないため、本文の
  `h1` と競合しません。落とすとタグだけが外れて題のテキストが本文の冒頭へ浮きます。
- **`class` は形を限定して通します。** コードブロックの言語表記（`language-*`）だけです。class
  属性はそれ自体が任意の文字列を運べるため、形を限定しないとスタイルを持つ class 名を本文から
  指定できてしまいます。
- **protocol-relative URL（`//host`）は sanitize の後段で落とします。** `hast-util-sanitize` の
  protocol 検査は `:` を含む値のスキームだけを見るため、`//host` は相対参照として素通りします。
  実体は外部ホストへの絶対 URL で、`img` に残ると公開するサイトから外部ホストへリクエストが飛びます。
- **`alt` を持たない `img` には空文字を補います**（`required`）。読み上げから内容が落ちるのを防ぎ、
  装飾として読み飛ばせる状態にします。
- **祖先の制約（`ancestors`）は構造の乱れを防ぐだけで、セキュリティの境界ではありません。** 判定は
  変換前のツリーを辿るため、祖先自身が落ちた場合の子は救えません（`table` 抜きの `tr > td` は `tr`
  だけが外れ、`td` が孤立して残る）。後処理は持ちません。
- `script` / `style` は内容ごと取り除き、`href` / `src` のプロトコルは `http` / `https` / `mailto`
  に限ります。

### 図のレンダリング

- **mermaid は図が現れたときだけ動的 import します。** mermaid は大きく、図を含まない文書のほうが
  多いため、静的な import にすると初期表示がその分だけ重くなります。
- **出力の SVG は sanitize を通しません。** 通す必要が無いためです。sanitize は「取得した Markdown
  を濾す」ためのもので、図へ渡すのはその濾過を通ったコードブロックの文字列です。図はその文字列から
  手元で組まれ、外から来た HTML はどこにも現れません。`securityLevel` は `strict` にします。
- **配色は面に合わせます。** portal は配色の切替を持たず OS の設定に従うため、`prefers-color-scheme`
  を見て `dark` / `default` を選びます。
- **レンダリングできなかった場合は原文をそのまま残します。** 図の構文は `scripts/mermaid-lint` が CI で検証して
  いるため壊れた図は届きませんが、届いたときに何も見えなくなるよりは読める形で残します。コンテナは
  `data-state`（`source` / `rendered`）で状態を示します。
- **mermaid は browser を必要とします。** 図の実寸をテキストの計測から決めるため、DOM を模した
  環境ではレンダリングできません（`mermaid.parse` は通っても `mermaid.render` は落ちます）。テストでは
  `mermaid` を mock し、コンテナを渡してレンダリングさせたことと状態の遷移だけを見ます。

## 表示状態と経路

- **共有・履歴・戻る操作に対して復元可能なのは位置ハッシュだけです。** 静的配信されるため経路を
  サーバへ問い合わせられません（[0141](../docs/adr/0141-portal-operations.ja.md)）。ハッシュは
  `#/<group>/<section>` で、解釈できない入力は「未指定」として扱い、空表示に落としません。
- **ハッシュに載せるのは「どの文書を見ているか」だけです。** 検索語と表示言語は一時的な絞り込みで
  あり、ハッシュに載せません。検索欄が client island なのは入力の操作性のためで、静的サイトには
  検索語を運ぶ先の server が無いため、結果もその場の状態としてレンダリングします。
- **要求された group は表示可能な group の中から選び直します。** 言語フィルタ後に消えている場合が
  あるため、無ければ先頭の group へ寄せ、候補が無ければ空である旨を出します。
- **section を指すハッシュではその見出しまで送ります。** group を切り替えるだけでは長い group の
  末尾にある section へ辿り着けず、link が指した先と表示がずれます。
- **文書は面（Dialog）で開きます。** 面は trigger を持たず、開くのはカード側からだけで、閉じる
  要求だけが面から来ます。開いた直後は題だけを確定させ本文は取得中としてレンダリングし、取得に失敗したら
  面を開いたままにしません。
- **検索コーパスは言語フィルタ後の group から組みます。** 表示していない項目が検索で引けると、
  結果を開けない状態になるためです。subgroup の項目も平坦化して含めます —— subgroup だけに置かれた
  項目が検索から漏れると、利用者からは「存在するのに引けない」状態になります。所属する section /
  group の名前は項目へ畳み込み、検索結果が単体でどこの項目かを示せるようにします。

### 表示言語の絞り込み

- 項目の言語（`en` / `ja` / `all`）と利用者が選ぶ表示言語（`EN` / `JA`）は**別の軸**です。`all` は
  翻訳の対を持たない項目（生成物 HTML や外部リンク）で、言語フィルタの対象外として常に先頭に残ります。
- **言語は section 単位で決め、配下の subgroup へ共有します。** JA を選んでいても JA の項目が 1 件も
  無い section は EN へ落とし、同じ section の中で subgroup ごとに言語が混ざる状態を防ぎます。
- section は items と subgroups のどちらかに中身が残っていれば保持し、空になった section と group は
  落とします。

## 操作要素の選び方

- **カードの行き先で操作要素を変えます。** Markdown はこのページの中で面を開くため `button`、それ
  以外（生成 HTML / 外部ツール）は別の文書への移動なので `a`（別タブ、`rel="noopener noreferrer"`）
  です。見た目を揃えるために片方へ寄せると、keyboard と支援技術には「押すと何が起きるか」が伝わり
  ません。
- **カードの面全体を当たり判定にするには擬似要素で広げます。** `Card` は `asChild` を持たず `div`
  をレンダリングするため、カード自体を `button` や `a` にはできません。操作要素は title に置き、
  `after:absolute after:inset-0` で当たり判定だけを広げます。役割は本物の `button` / `a` が持つため
  支援技術には正しく伝わり、focus の表示はカード側の `focus-within` が担います。
- **Accordion（native `details`）の見出しに link を置きません。** `summary` はそれ自体が操作要素で、
  中へ link を置くと操作要素のネストになって keyboard の到達順が壊れます（axe の
  `nested-interactive`）。遷移は section 側の link が担い、link は group と section の両方を指すため、
  section を選べば group も切り替わります。
- native `details` は常に一項目だけを開く制御を持ちませんが、文書を見比べる用途では複数開ける方が
  都合がよいため、排他にするための client island は足しません。

## 起動と失敗の見せ方

- 生成物は `./docs.json` を**相対パスで取得**し、schema で検証してからマウントします。形の不一致は
  配信事故であって利用者の入力エラーではないため、回復を試みず例外にします。
- **失敗の原因は画面へ出します。** 静的配信されるためログの送り先を持たず、壊れた画面を見ている人が
  そのまま原因を追える形にしておかないと、失敗が誰にも届きません。取得の失敗（応答の状態）、JSON
  として壊れている、形が違う（どの項目か）のいずれも文言に含めます。

## テストの責務

frontmatter が `test-requirement: [unit, component]` と 2 つ挙げるのは、この配下が両方を抱える
ためです（[0090](../docs/adr/0090-testing-strategy.ja.md)）。文書の解釈・整形・検索・経路は純粋
ロジックとして確かめ、レンダリングするコンポーネントは React Testing Library で確かめます。どちらを負うかは対象が
レンダリングを返すかで決まります。

テストはルートの vitest suite（[`vitest.config.ts`](../vitest.config.ts)）に載り、アプリ本体と同じ
カバレッジのゲートを受けます。別 suite にすると片方だけが緑という状態を作れてしまうためです。
カバレッジから外すモジュールは frontmatter の `coverage-exclusions` が記録します
（[0090](../docs/adr/0090-testing-strategy.ja.md)）。

この配下で繰り返す書き方:

- ルートの環境は `node` なので、レンダリングするコンポーネントのテストはファイル先頭の `// @vitest-environment jsdom`
  で切り替えます。
- `fetch` は MSW（`setupServer`、`onUnhandledRequest: "error"`）で受けます。取得中の姿を捉える
  テストは応答を `delay("infinite")` のまま返さないでおきます —— 返してしまうと、面が出た時点で
  本文が入っていることがあり、捉えられるかどうかが取得の速さ次第になります。`Error` でない値が
  投げられる状況は HTTP の応答では作れないため、そこだけ `fetch` を直接差し替えます。
- jsdom が実装しない `scrollIntoView` は `Element.prototype` へ差し替え、呼ばれたことだけを見ます。
- 打鍵に追従する検索欄は fake timers（`shouldAdvanceTime: true`）で待ち時間を進めます。
- Dialog は Portal で `body` 直下へレンダリングするため、面を開いた状態の axe は `container` ではなく
  `baseElement` へ掛けます。axe で無効化する規則は [0091](../docs/adr/0091-test-verification-methods.ja.md)
  が決めます。
- 起動関数が root を返さない場合は `createRoot` を差し替えて生成物を捕まえ、テスト側で畳みます
  （[`docs/testing-conventions.md`](../docs/testing-conventions.ja.md)）。

## デザインシステムとの関係

UI は [`src/components/design-system`](../src/components/README.ja.md) のコンポーネントで組みます。
**コピーせず、`@` alias でアプリ本体のソースを直接参照します。** コピーすると乖離した時点で、
実運用の画面でデザインシステムを検証するという目的が失われるためです。

このビューアーはデザインシステムの実利用者であり、Storybook の中だけでは出てこない
負荷（実データ量・実文書長・実際の組み合わせ）を掛ける役割を持ちます。

直接参照を成り立たせる配線は 3 か所です。

- [`vite.config.ts`](vite.config.ts) の alias `@` → `../src`。design-system のコンポーネントが内部で使う
  `@/` もこの alias で解決されます。
- [`src/styles.css`](src/styles.css) はアプリ本体の `globals.css` をそのまま `@import` します。
  トークン・組版・foundation の CSS を複製すると、同じ理由で目的が失われます。
- Tailwind の class 検出はその CSS の位置から辿るため、別パッケージにあるコンポーネント（`../../src/components`）
  とビューアー自身のソースを `@source` で明示します。

本文の組版はデザインシステムの `typeset` 基盤が持ち、ドキュメント用の preset（`typeset-docs`）を
デフォルトで当てます。

## 構成

| ディレクトリ | 役割 |
| --- | --- |
| `src/docs-json/` | 生成物 `docs.json` のスキーマと読み取り。形の不一致は配信事故として例外にする |
| `src/lang-filter/` | 表示言語での絞り込み。JA の実体が無い section は EN へ落とし、section 内で言語が混ざらないようにする |
| `src/search/` | 検索コーパスの組み立て。所属する section / group 名を項目へ畳み込む |
| `src/hash-route/` | 位置ハッシュ `#/<group>/<section>` の解釈と組み立て |
| `src/markdown/` | Markdown から HTML 文字列への変換。出力は必ず sanitize へ渡す |
| `src/sanitize/` | ドキュメント用 allowlist と、sanitize 済みであることを表す Value Object |
| `src/document-content/` | sanitize 済みのツリーを React 要素としてレンダリングする。`pre` の差し替えだけを持つ |
| `src/mermaid-diagram/` | ツリーの形からの mermaid 原文の取り出しと、原文を図としてレンダリングするコンポーネント |
| `src/portal-app/` | ビューアー本体。表示状態（ハッシュ・言語・検索語・開いている文書）を持つ |
| `src/portal-sidebar/` | group と section への導線と、生成 HTML / 外部ツールへの常設リンク |
| `src/portal-card-grid/` | 項目をカードとして並べる。行き先で `button` / `a` を選ぶ |
| `src/mount/` | 生成物の取得・検証・マウントと、失敗の見せ方 |
| `src/main.tsx` | エントリ。`#root` を探して `mount/` へ渡すだけ |

配信先のパス接頭辞を持たないよう `vite.config.ts` は `base: "./"` とし、サイトのどの位置へ置いても
動くようにします。生成物の取得（`./docs.json`）も相対です。portal の URL を配信側の都合で決められる
状態を保つためです。

## 運用

- **依存は極力単独で完結するコンポーネントに寄せる**。このビューアーは別リポジトリへそのまま移植できる状態を
  保つ前提があり、引き込んだ依存はそのまま移植コストになる。対に `-native` / `-client` があるコンポーネントは、
  要件が許す限り `-native` を優先する（表示言語の切替は `ToggleGroupNative`。検索欄は打鍵に追従する
  要件があるため `SearchFieldClient`）
- 経路・絞り込み・検索・生成物の読み取り（`docs-json` / `lang-filter` / `search` / `hash-route`）は
  zod 以外に依存させない。Markdown の変換と無害化（`markdown` / `sanitize`）は marked と hast の
  一式に閉じる。輸出時にそのまま持っていける状態を保つ
- Next.js 固有 API（`next/link` / `next/image` / Server Components）は使わない
