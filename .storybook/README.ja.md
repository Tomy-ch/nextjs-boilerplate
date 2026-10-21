> **このファイルは [`README.md`](README.md) の日本語訳です。**
> 直接編集しないでください。変更は英語の canonical な `README.md` を先に更新し、そのうえでこの日本語訳を同期してください。
> エージェントが読むのは `README.md` だけです。このファイルは人間が読むための翻訳です。

# .storybook

コンポーネントカタログ（Storybook）の設定と、カタログ自身が持つ判定の置き場
（[0054](../docs/adr/0054-ui-catalog-storybook.ja.md)）。story そのものはコンポーネントの隣に置き、ここには
置かない。例外は**対象が特定のコンポーネントではなく、公開面や SSOT の全件であるインベントリ**で、design token のインベントリ
[`design-token.stories.tsx`](design-token.stories.tsx) とアイコンのインベントリ
[`icon.stories.tsx`](icon.stories.tsx) をここに持つ（配置の根拠は
[`src/components/README.md`](../src/components/README.ja.md)）。

## 構成

| パス | 役割 |
| --- | --- |
| `main.ts` | 読み込む story の範囲・addon・配信するアセット。横取り用の service worker を依存からコピーする。使用状況の外部送信を切る |
| `preview.tsx` | 配色と系統の切り替え、横断 Provider の mount、Server Action の差し替え宣言、横取りの起動、story ごとの例外の受け止め、mock の戻し |
| `preview.css` | story をレンダリングする面だけをこのリポジトリの配色トークンへ寄せる |
| `manager.ts` | カタログの外枠の見た目 |
| `css.d.ts` | global CSS の side-effect import の型宣言 |
| `msw/` | カタログが自分で答える `/api/*`（契約からの生成物ではない。置き場を分ける理由は [`mocks/README.md`](../mocks/README.ja.md)） |
| [`lib/`](lib/) | カタログ自身の module —— 表示のための計算、例外の受け止め、横取りの対象判定、配るアセットの綴り |
| [`public/`](public/README.ja.md) | カタログだけへ配るアセット。アプリの `public/` と分ける理由と、足すときの決まりは同 README |
| `*.stories.tsx` | インベントリの story。`main.ts` の `stories` が `./*.stories.*` を拾う |

`lib/` はコンポーネントの隣に置いた story と、story が読む fixture からも読む。経路は `~catalog/*` で、宣言は
[`tsconfig.json`](../tsconfig.json) の `paths`、コピーが [`vitest.config.ts`](../vitest.config.ts) にある。
**`@` で始まるエイリアスにはしない。** `@x/y` は npm の scope と同じ形なので、biome の
`noUndeclaredDependencies` が未宣言の依存として弾く。

## 設定が持つ判断

設定ファイルは単体で回せない（後述「テストの責務」）ので、そこに置いた判断はここに書く。

### `main.ts`

- **使用状況と更新確認の外部送信は切る**（`core.disableTelemetry` / `disableWhatsNewNotifications`）。
  カタログの build は CI の中で最も多く回る対象（vrt / a11y / storybook-build / docs の配信）で、
  デフォルトのままだとそのたびに外へ出る。送る相手はこのリポジトリの利用者ではなくテンプレートとして配られた先の
  CI であり、送る値も送り先もテンプレートから作った側が選んだものではない
  （[0010](../docs/adr/0010-standards-and-non-lockin.ja.md) は外部への送信をデフォルトで無効にしておく）
- **横取り用の service worker は設定の読み込み時に依存から `public/` へコピーする。** 起動コマンドに
  持たせない理由は [0054](../docs/adr/0054-ui-catalog-storybook.ja.md)。コピーした実体は追跡しない
  （[`public/README.md`](public/README.ja.md)）
- 配信は `staticDirs` でアプリの `public/` とカタログの `public/` を並べる。**どちらも配信の根から
  見える**ので、名前がぶつかるとどちらが出るかが配信の順序に依存する

### `preview.tsx`

- **書体の変数は実アプリの `<html>` と同じ位置（`document.documentElement`）へ class として付ける。**
  `next/font` は変数を class に載せるので、置かないとカタログだけが素の書体でレンダリングされ、ベースライン画像が実物と
  一致しない。実アプリでは系統ごとに読む書体が分かれるが、カタログは系統をまたいで同じ文書に並べる
  ので、**全系統の書体をまとめて配る**
- **配色は `:root` の `data-theme`、系統は `body` の `data-surface`** に置く。切替の軸と属性の位置は
  [`tokens/README.md`](../tokens/README.ja.md) が持つ（Portal の中身が属性の外へ落ちないよう、系統は
  `body` 相当でなければならない）。**デフォルトへ戻すときは属性を外す** —— 「OS の設定に従う」は
  `data-theme` を外した状態そのものであり、デフォルトの系統は `:root` 側に出ているため、デフォルト値を属性として
  書くのではなく無い状態を作る
- **横断 Provider は story ごとではなく、全 story 共通の decorator として、実アプリが layout shell へ
  mount するのと同じ位置に置く**（[0026](../docs/adr/0026-layout-shell-mount.ja.md)）。story ごとに包む形に
  すると、包み忘れた story はコンポーネントではなく Storybook のエラー画面をレンダリングし、それがベースライン画像として承認され
  うる
- **story の例外は `lib/story-error-boundary` が受け止める**（判断は同 component の doc）。decorator は
  story の `id` を `key` に与え、story が変わるたびに作り直す。持ち越すと直した story まで落ちたままに
  見える。境界の画面は `pageerror` に届かないので、撮影と a11y は `data-story-error` を見て落とす
  （[`vrt/README.md`](../vrt/README.ja.md)「壊れた story を「変わっていない」で通さない」）
- **`beforeEach` で mock を全て戻す**（`resetAllMocks`）。差し替えた mock はモジュール共有で、docs
  ページは同じページの story を同時にレンダリングするため、戻さないと隣の story が別の story の戻り値を出す。
  `fn(impl)` で与えた実装まで戻るので、差し替え先のデフォルトの応答が復帰する
- **同一オリジンの `/api/*` は全 story 共通の `loaders` で横取りを立ててからレンダリングする**。story 側で
  `fetch` を差し替えない（[0054](../docs/adr/0054-ui-catalog-storybook.ja.md)）
- **`parameters.nextjs.appDirectory` は `true`。** このリポジトリは App Router のみを使い、
  `useRouter` などの navigation hook は App Router の context が無いと throw する
- `parameters.a11y.test` は `error`。panel は手元の確認用で、合否を負うのは vrt と同じコンテナで走る
  axe（[0054](../docs/adr/0054-ui-catalog-storybook.ja.md) / [0091](../docs/adr/0091-test-verification-methods.ja.md)）
- sidebar の並び（`storySort`）と `tags: ["autodocs"]` の根拠は
  [`src/components/README.md`](../src/components/README.ja.md)「Storybook の表示規約」が持つ

### `preview.css`

- **塗り替えるのは story をレンダリングする面（`.sbdocs-preview` / `.docs-story`）だけ。** Storybook の docs は
  独自のテーマを持ち toolbar の配色切替に追従しないので、何もしないと「Storybook が塗った白い面」の上に
  「dark へ切り替わった我々の文字」が載って読めなくなる。docs の chrome（見出し・説明文・controls 表）は
  Storybook のものとして light のまま残す —— そこまで追うと emotion が生成するハッシュ付き class を
  1 つずつ辿ることになり、Storybook の更新のたびに壊れる
- **参照するのは semantic レイヤーの変数**（`--semantic-color-*`）。`--color-*` は `@theme inline` の変数で、
  utility へ埋め込まれる代わりに変数としては出力されないものがあり、素の CSS からは解決できない

### `manager.ts`

- **addon の panel は右に置く。** a11y の違反と Controls は story を見ながら読むもので、下に置くと縦を
  story と奪い合い、背の高い story では視界から押し出される

## `lib/` が持つもの

story と設定の両方から読む、判定を持つ module の置き場。1 つの module が 1 つの判断を持ち、
**設定と story はその判断を書き写さずに呼ぶ**。

| module | 持つ判断 |
| --- | --- |
| `sample-asset` | カタログが配るアセットの綴りを公開する**唯一の場所**。story はここからしか URL を読まないので、アセットを改名しても直す場所が 1 つで済む。ルート絶対で書くのは、配信の根へコピーされるアセットを story 側の位置に依らず指すため |
| `pending-action` | 決して解決しない送信先。**送信中の姿を撮る story だけが使う。** `useFormStatus` は送信の完了で畳むので、すぐ返る送信先では撮る前に終わっている。差し替えのデフォルトはあくまで解決済みの成功で（[0054](../docs/adr/0054-ui-catalog-storybook.ja.md)）、留めるのは主題が送信中そのものであるときに限る |
| `story-error-boundary` | story のレンダリング・操作で投げられた例外を、その場の 1 枚として見せる。黙らせるためではなく、スタックトレースの赤い画面を説明に替えるためのもので、**起きたことは残す**（文言・`data-story-error`・console）。server の無いカタログで Server Action が `config` の読み込みに落ちるときの受け止め先でもある |
| `unhandled-request` | 横取りされなかったリクエストを警告と数えるか。**報せるのは `/api/*` だけ** —— カタログ自身のアセットとドキュメントの取得まで警告にすると、開くたびに本物の見落としが埋もれる |
| `contrast` | 2 色のコントラスト比（WCAG の定義）。**合否を決める値ではない。** a11y の合否を負うのは axe で、ここが出すのは配色を見る人が地との差を読み取るための数値。`rgb()` の数値の並びだけを読み、`color-mix()` や名前の色は「読めなかった」として `null` を返す |

**送信を持つコンポーネントの story が使う形はここに集める。** 送信先の代役（成功して留まる / 解決しない）を
story ごとに書くと、同じ Promise の作り方が story の数だけ散り、直すときにどれが正か判らなくなる。

## インベントリの story

ここに置く story は、**名前を書き写さず、公開面や生成された SSOT から実行時に読む**インベントリである
（対象を足せばインベントリに出る。書き写すと足したときにインベントリの側が古いまま残り、インベントリとして信用できなくなる）。
`title` は `<見出し>/Catalog`、`layout` は `fullscreen`。見出しがコンポーネントのレイヤーでない理由は
[`src/components/README.md`](../src/components/README.ja.md) が持つ。

- **CSS の値は実行時に読む。** 隠した probe 要素へ `var(--x)` を当て `getComputedStyle` で読むと、
  色として解決した値が取れる。宣言した式そのもの（`color-mix()` など）も見せたいときは、同じ変数を
  custom property（`--probe: var(--x)`）にも当て、`getPropertyValue` で読む —— 解決前の綴りはそちらに
  しか残らない
- **実行時に読んだ値は mount のときの値である。** 配色や系統を切り替えても effect の依存は変わらない
  （読む変数の一覧は同じ）ので、切替の軸を `key` にして画面ごと作り直す。同じツリーを使い回すと前の値が
  残る
- 公開面の全件を読むために名前空間 import（`import * as`）を使ってよいのは、**このバンドルがカタログに
  しか載らず、アプリがレンダリングするコンポーネントではない**からである

## 題材を持つ設定は `sample:` マーカーで囲む

差し替え宣言（`preview.tsx` の `sb.mock` の並び）と `msw/handlers.ts` は題材そのものを列挙する。
**列挙は `sample:` マーカーで囲み、捨てた後も読み込める形（空の配列、題材専用の import を持たない
import 行）を `replace-with` に退避しておく** —— 題材を捨てた瞬間に設定が壊れないようにする。破棄のスキャンから
外れている区画（`public/`）は [`public/README.md`](public/README.ja.md) が持つ。
マーカーの意味は [boilerplate-only conventions](../docs/get-started/boilerplate-only-conventions.ja.md) が持つ。 <!-- boilerplate-only:line -->

## story がカタログのコンテナから受ける制約

コンポーネントではなくカタログのコンテナに由来する決まりは、ここが持つ。story を書く側の規約は
[`src/components/README.md`](../src/components/README.ja.md) と
[`src/features/README.md`](../src/features/README.ja.md) にある。

- **overlay の中身は canvas の外に出る。** dialog / menu / combobox の面は Portal で `document.body`
  直下へレンダリングされるので、`play` は開く操作を `within(canvasElement)` から、開いた面を
  `within(document.body)` から引く。canvas の内側で待つと、開いているのに見つからないまま timeout する
- **同じ store を読む story を 1 つの docs ページへ並べるときは、iframe を分ける**
  （`parameters.docs.story.inline: false`）。docs ページは載せた story を 1 つのツリーでレンダリングするので、開いた状態と
  閉じた状態のように store の値が違う story を並べると、後の story が立てた値が先の story にも及ぶ。
  focus を閉じ込める面も同じ形で分ける —— 展開するとページそのものを操作できなくなる
- **差し替えた Server Action の戻り値は story の間で持ち越されない**（`preview.tsx` の `beforeEach`）。
  失敗の見え方を出す story は、その story の中で戻り値を差し替える
- **横取りが立てられなかったときも story はレンダリングされる。** 起動の失敗は console に残して先へ進むので、
  `/api/*` に触れる story だけが「応答が返らなかった」見え方へ落ちる。その姿を見たら、まず console を
  読む

## `msw/` の答え方

- **契約が区別している 2 つの結果は、別々に到達できる入力を持つ。** 「該当なし」と「機構が使えない」の
  ように、契約が別のマーカーで返し画面も言い分ける結果を、モックが片方へ畳むと、画面が言い分けている側を
  カタログで確かめられない
- **宣言に無い入力への応答は、契約が「該当なし」に定めた形で返す。** モック独自の失敗（`404` など）を
  発明すると、画面は契約に無い経路を通る
- **読み進める一覧に続きを持たせない**（cursor は `null`）。カタログの一覧は数件しか置かないので末尾の
  目印が最初から見えており、続きを返すと届いた先でまた末尾が見え、際限なく取りに行く。DOM が静止しない
  のでベースライン画像も撮れない（[`vrt/README.md`](../vrt/README.ja.md)「揺らぎを止めてある」）
- **繋ぎ直す購読には、繋がる URL を返さない。** 発券エンドポイントには「対象なし」を返し、画面を待機の姿で
  止める。返すと実際に繋ぎに行き、繋がらないたびに張り直して story が静止しなくなる
  （[`mocks/README.md`](../mocks/README.ja.md)）
- **story と同じ値を返すところは feature の fixture から読む。** 一覧の続きや候補の並びを handler
  側で書き写すと、story と応答が別々に古くなる
- **worker の配信元は相対（`./mockServiceWorker.js`）で指す。** カタログは公開時に下位のパスへ置かれる
  ので、絶対パスでは見つからない。service worker が持ち場にするのは配信元のディレクトリで、story を
  レンダリングしているページがその中にあれば、ページの出すリクエストは宛先を問わず通る
- **登録の完了を待ってからレンダリングする**（`preview.tsx` の `loaders`）。待たずにレンダリングすると最初の取得だけが横取り
  されずに出ていき、その story だけが失敗した経路の見え方になる。起動は 1 度だけ行い、2 度目以降は
  同じ Promise を返す
- **起動の失敗は投げない。** 待っているのは全 story 共通の loader なので、投げると `/api/*` に触れない
  story までレンダリングされなくなる。記録だけして先へ進む

## テストの責務

frontmatter の `test-requirement: unit` が掛かるのは `lib/` である。

**判定を持つものは `lib/` へ置く。** `main.ts` / `preview.tsx` / `manager.ts` は設定で、読み込まれた
時点で副作用を起こす（アセットの複製・書体の class 付与・mock の宣言）ため単体では回せない。`msw/worker.ts`
も同じく、ブラウザの service worker を立てるだけである。設定や配線の中に判定を書くと、そこは検査の
届かない場所になる。

**この配下は丸ごと 1:1 ゲートとカバレッジ母数に乗る**（[`vitest.config.ts`](../vitest.config.ts) /
[`scripts/one-to-one.gate.test.ts`](../scripts/one-to-one.gate.test.ts)）。外れるものは
[`scripts/lib/untested-modules.ts`](../scripts/lib/untested-modules.ts) が理由と撤去条件つきで
宣言する。範囲を狭めて外すと、外した記録がどこにも残らない。
