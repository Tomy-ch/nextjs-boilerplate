---
imports-allowed: [features, components, capabilities, stores, adapters, errors, logging, config, model, observability] # 生成物。`pnpm gen:architecture` で直す
forbidden: [business-logic, direct-fetch]
test-requirement: route
coverage-exclusions:
  - "src/app/**/page.dev.tsx"
  - "src/app/**/page.tsx"
  - "src/app/fonts.ts"
  - "src/app/icon.tsx"
  - "src/app/apple-icon.tsx"
  - "src/app/opengraph-image.tsx"
---

# app

App Router の driving adapter です。`page.tsx` と `layout.tsx` は feature を薄く呼び出し、route handler は `adapters/server` を介して外部接続します。

## 受け入れるもの

- route segment、route handler、metadata と layout への横断 UI / Provider の mount
- Next.js が規定する特殊ファイルと route segment
- **複数の route group の器が共有する宣言モジュール**（`fonts.ts` / `site.ts` など）。route
  要素のどれにも当たらないが、器ごとに書くと片方だけが動く。利用者から見て同じサイトの器が
  描く時点の違いだけで分かれているとき、導線の顔ぶれもここに 1 つ持つ —— 役割で出し分ける導線は
  含めず、出す・出さないの判定を持つ器が自分で足す。テストは `unit` として扱う
- **器の隣に置く、主体で決まる導線の穴**。役割で出し分ける導線は、session を読む Server Component を
  `Suspense` の穴として器へ差す（判定の置き方は [docs/rules.md](../../docs/rules.md)「認可と入口」）。
  置き場が feature ではなく器の隣なのは、`adapters/server/auth` を引けるのが `app` と `adapters` だけ
  だからである。器の側で session を読むと、その器を通る画面がすべて往復を待ってから 1 バイト目を返す。
  テストは描画の状態（出すとき / 出さないとき）で割る
- **複数の error 境界が共有する組み立て**（`boundary-feedback.ts`）。境界が受け取った失敗を表示できる形と
  再試行の導線へ組む 1 か所で、版が揃わない失敗（[docs/rules.md](../../docs/rules.md)「フォームと送信」）
  の扱いをここだけが持つ。境界ごとに書くと、その扱いが 1 か所だけ古くなる。テストは `unit` として扱う
- **並行 route の slot**（`@<name>/`）。page から layout へ props は渡せないので、画面ごとに違う値を器へ
  届ける橋は slot になる（現在地までの階層など）。`default.tsx` を置き、階層を持たない画面にも空を返す
  slot を route ごとに置く —— soft navigation では直前の slot が残るためで、落とし穴は
  [docs/design/rendering.md](../../docs/design/rendering.md) が持つ
- **metadata ファイル**（`sitemap.ts` / `robots.ts` / `icon.tsx` / `apple-icon.tsx` /
  `opengraph-image.tsx`）。Next.js の規約で特殊な Route Handler になる（[0044](../../docs/adr/0044-seo-metadata-strategy.md)）。
  宣言は `architecture.ts` の `app-metadata` element が持つ —— 何を挙げるか・何を断るかの判定を持つ
  `sitemap.ts` / `robots.ts` は `unit` として扱い、絵を 1 枚返すだけの 3 つは判定を持たないので単体では
  回さない（`scripts/lib/untested-modules.ts`）。
  絵として返ることと、挙げた URL が実在すること・正規 URL が自分を指すことは、起動したアプリから
  取って見る（`make e2e-metadata`）
- **root layout が mount する計装**（`telemetry.tsx`）。描画するものを持たず、ブラウザ側のシグナルを
  中継へ送り出すだけの client component である。`components` にも `capabilities` にも置けない ——
  どちらも外部への送信を持てないため（[0082](../../docs/adr/0082-client-observability.md)）。
  テストは `component` として扱う
- **root layout が mount する同意の島**（`consent.tsx`）。同意を尋ねる面（`components`）と、同意を
  要する資材のゲートを、1 つの購読の裏で束ねる client component である。`components` にも
  `capabilities` にも置けない —— どちらも `stores` を引けないため
  （[0031](../../docs/adr/0031-policy-state-supply.md)）。テストは `component` として扱う
- **同意の島の裏へ置くタグマネージャ**（`analytics.tsx`）。容器 ID を config から読み、宣言のある
  配備でだけ読み込む client component である。`components` に置けない —— `config` を引けないため。
  テストは `component` として扱う

**shell を通らない画面は、自分で `main` を置く。** route group の外に立つ画面（`not-found.tsx` や
`dev/` の下）は、route group の layout が置く landmark を持たない。包む物が無いと、支援技術
から本文へ直接跳べない。

## 受け入れないもの

- 業務ロジック、画面ユースケースの編成、route segment からの直接 fetch

## この層が持つ判断

route ごとに決まることがここにあります。**そのうちいくつかは、この README にも ADR にも書けません**
—— 画面ごとに違う答えを持つものだからです。答えを書く場所は決まっています。

| 判断 | 宣言する場所 | 答えを持つ文書 |
| --- | --- | --- |
| 殻を配れないこと（`instant = false`） | `page.tsx` / `layout.tsx` | その画面の機能要件（[`docs/spec/route/**`](../../docs/spec/README.md)） + [0041](../../docs/adr/0041-cache-components-decision.md) |
| 待ちの境界（`Suspense` をどこへ掛けるか） | `page.tsx` | 同上 |
| 失敗と不在の面 | `error.tsx` / `not-found.tsx` | 同上 + [0080](../../docs/adr/0080-error-handling.md) |
| metadata | `page.tsx` / `layout.tsx` | [0044](../../docs/adr/0044-seo-metadata-strategy.md) |
| 横断 UI と Provider の mount | `layout.tsx` **だけ** | [0026](../../docs/adr/0026-layout-shell-mount.md) |
| 外部との往復 | `api/**/route.ts` | [0071](../../docs/adr/0071-bff-api-integration.md) / [0025](../../docs/adr/0025-app-layer-elements.md) |

**描くモードを画面が宣言しません。** 殻と穴の分かれ目は器の形 —— 何を `Suspense` の外に置き、
何を内に置くか —— で決まります（[0041](../../docs/adr/0041-cache-components-decision.md)）。
`dynamic` / `revalidate` のような segment config は持ちません。**殻を配れない画面だけが
`export const instant = false` を理由つきで名乗り**、`scripts/render-mode` が prerender の結果と
突き合わせます。

**殻を配れないと判断した理由は仕様書へ書きます。** route の隣の doc コメントだけに置くと、その
画面がいつ描かれるかを文書から辿れなくなります。コードのコメントに残すのは、その場で効く注意
だけです。

**待ちの境界も同じです。** 節ごとに分けるか画面全体で 1 つにするかは、何を同時に待つかで決まる
画面の判断であり、層の既定ではありません。

### 殻と穴の定型

`page.tsx` は同じ形に収まる。**殻**は default export が返し、**穴**は同じファイルの async な
`<Screen>Content` が受け持つ。

```tsx
export default function ScreenPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <ContentContainer>
      <PageHeader>…</PageHeader>                {/* 殻。待たずに配れる */}
      <Suspense fallback={<ScreenSkeleton />}>  {/* 穴。fallback は feature の ui/skeleton */}
        <ScreenContent params={params} />       {/* Promise のまま渡す */}
      </Suspense>
    </ContentContainer>
  );
}

async function ScreenContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;                  // params / searchParams を解くのはここ
  await requireXxx(screenPath(id));             // 主体に依る判定もここ。殻に主体の情報は載らない
  return <ScreenPageContent id={toXxxId(id)} />; // 識別子を契約の型へ通すのもこの層
}
```

- **器は `params` / `searchParams` を await しない。** Promise のまま穴へ渡し、穴の内側で解く。器で
  待つと、待っている間は殻すら配れない（[docs/rules.md](../../docs/rules.md)「描画とキャッシュ」）
- **識別子を契約の型へ通す**（`model` の `toXxxId`）**のはこの層の仕事**で、feature は通した値を受け取る
- **実時計は穴の内側で `connection()` を待ってから読む**（`config/clock`）。プリレンダーの最中には
  値が定まらない
- **穴の内側の転送は殻を配り終えた後になる。** 応答は 200 で出ており、転送は `Location` ではなく
  meta タグで伝わる。未認証は前捌き（`proxy.ts`）が入口で本物の転送として捌くので、ここまで届くのは
  バックエンドに問わないと分からない判定（主体についてバックエンドだけが持つ状態など）だけである
  （[0041](../../docs/adr/0041-cache-components-decision.md) / [0079](../../docs/adr/0079-auth-frontend-seam.md)）
- **一次資源が無いことも 200 で伝わる。** 見つからないことは `not-found.tsx` と `noindex` が伝える
  （[0080](../../docs/adr/0080-error-handling.md)）
- **確かめる前に殻を配れない区画は、器が判定し `instant = false` を名乗る。** 判定を穴へ落とすと、
  その面の殻（区画の名前・導線）が確かめる前に誰にでも配られる
- **`Suspense` に `key` を与えない。** 条件が変わったときに取り直す範囲は feature の `page-content` の
  内側で区切る。器の境界に鍵を与えると、絞り込みの入力欄まで待機表示へ落ちる。取り直す範囲を
  画面より狭くしたい画面では、待ちの境界そのものを feature 側へ置き、器は殻だけを持つ
- **見出しは 1 度だけ置く。** 現在地（パンくず）が見出しを担う画面、画面の高さいっぱいを本文に使う
  画面は `PageHeader` を置かない。何の画面かはタブのタイトル（`metadata.title`）と nav が示す
- **表示と編集、一覧と 1 件は別の route にする。** 1 つの画面に同居させると、どちらの状態で開いて
  いるかが URL から失われ、戻る操作も共有もできなくなる
- **Server Action は器が feature へ渡す。** `page.tsx` が隣の `actions.ts` を import し、feature の
  `page-content` に props として手渡す。feature は `app` を引けないので、送信先を受け取る形にしかならない。
  同じ理由で、`NEXT_PUBLIC_` の公開定数も器が読んで渡し、画面の側は受け取った値で判定する
- **殻に載せる文言は殻の中で完結させる。** 断り書きや注意のように読み始める前に目に入るべきものは、
  見出しより前かつ `Suspense` の外へ置く。取得を待って出すと、待っている間は普通の画面に見える

feature 側の `page-content` / `view` / `ui/skeleton` の分担は [features/README.md](../features/README.md)
が持つ。route を 1 本足す手順の通し例は [docs/tutorial/build-a-screen.md](../../docs/tutorial/build-a-screen.md)。

### 失敗と不在の面の作法

責務と境界の粒度は [0080](../../docs/adr/0080-error-handling.md) が持つ。ここにあるのは、この層で同じ形を
繰り返す部分である。

- **`error.tsx` は文言を組まない。** production では Server Component から投げた本文が伏せられ、境界には
  `digest` しか渡らない。文言は分類ごとに `errors` のカタログから採り、`digest` は問い合わせ番号として
  出す。表示と再試行の導線は `boundary-feedback.ts` が 1 か所で組む
- **`error.tsx` は同じ segment の `layout.tsx` を包まない。** 親の境界に任せると、失敗した子だけでなく
  親が置いたパンくずや導線まで一緒に消える。取得が 1 系統落ちただけで戻る導線ごと失う重さに合わない
  画面には、その画面の segment に境界を置く。置かないと `global-error.tsx` まで抜け、`html` / `body`
  から描き直した素の画面になる
- **`global-error.tsx` は inline style だけで装飾する。** この境界が出るのは root layout ごと壊れたときで、
  `globals.css` も design token も Provider も当てにできない。class に頼ると文字が読めない画面になり得る
- **`not-found.tsx` は表示だけを持つ。** 文言はカタログから採り、戻る導線は上の階層へ 1 本だけ出す。
  「他人のもの」と「存在しないもの」は区別しない（[docs/rules.md](../../docs/rules.md)「認可と入口」）。
  **`notFound()` を呼ぶ画面は、器の内側に `not-found.tsx` を持つ segment に置く。** 無ければ root の
  `not-found.tsx` が受け、route group の器ごと外れて導線もパンくずも消える。`error.tsx` で器を残した
  segment なら、`not-found.tsx` も同じ高さに置く
- **確定の失敗は境界に来ない。** Server Action が結果として返し、操作の隣に出る。境界へ来るのは、
  確かめる内容そのものを読めなかったときである

### metadata の土台と差分

root layout が `metadataBase`（外から見た origin。`config/site`）と `title.template` を置き、索引させ
ない環境では `noindex` も置く。各 segment が宣言するのはそこからの差分で、置くものは決まっている。

| 画面 | 宣言するもの |
| --- | --- |
| 誰でも開け、索引させたい画面 | `title` / `description` / `alternates.canonical`（自分の経路） |
| 認証の要る画面、利用者ごとに中身が変わる画面 | 上に加えて `robots: { index: false, follow: false }`。索引させる環境でも隠す |
| 動的セグメントの画面 | `generateMetadata`。取得の分類を写す判定は feature 側の module に置き、page は薄く呼ぶ |

canonical を root に置かないのは、`alternates` が segment 単位で丸ごと差し替わるためである。root
に置くと、宣言していない画面がすべて `/` を正規 URL として名乗る。

`sitemap.ts` が挙げるのは索引させたい画面だけで、`robots.ts` が断る経路は保護の宣言（`model/authz`）
から採る。どちらも書き写しを持たない。

- **`robots.txt` と `noindex` は二重に持つ。** 効く相手が違う —— `robots.txt` は巡回そのものを止め、
  `noindex` は巡回した結果を索引から外す。`robots.txt` の照合は接頭辞のままで区切りを見ないが、
  広く断る側に外れるだけなので害はない
- **`robots.ts` は静的に描かれ、build 時の設定が焼き込まれる。`sitemap.ts` は `connection()` を待って
  要求時に組む。** 挙げる経路にバックエンドから取る一覧が混ざるなら、build 時に取ると配信物を作る
  場所からバックエンドへ届くことが前提になり、その時点の一覧が焼き込まれる
- **辿った一覧は要求をまたいで持つ**（`use cache` + `cacheLife`）。クローラは同じ URL を繰り返し開くので、
  開くたびに末尾まで辿ると 1 要求が一覧の件数ぶんの backend 呼び出しへ膨らむ。`use cache` の中では
  cookie を読めないので、辿るのは主体を名乗らない口に限る
- **Sitemaps protocol の上限（1 ファイル 50,000 URL）で打ち切る。** 載せ切れない分を黙って落とすのでは
  なく、挙げた件数から分割（`generateSitemaps`。[0044](../../docs/adr/0044-seo-metadata-strategy.md)）が
  要ることを読めるようにする。分け方は経路の構成で決まるので、本体は分割を持たない
- **`lastModified` / `changeFrequency` / `priority` は根拠が無ければ付けない。** 更新日時は契約が返す
  ときだけ、残りは検索エンジンが参考程度にしか読まない値である
- **一覧の取得が失敗しても、バックエンドに依らない経路は挙げる**（[0044](../../docs/adr/0044-seo-metadata-strategy.md)）。
  失敗の分類と記録は `adapters` の境界が済ませているので、ここでは記録し直さない

### 絵を返す metadata ファイル

- **`export … from` で書けない。** Next.js は metadata ファイルの export を segment の設定として読み、
  再 export を不正として build を止める。`alt` のような値は import して自分の名前で export する
- **タブのアイコン・ホーム画面のアイコン・`favicon.ico` は 3 つで 1 組。** `favicon.ico` は `<link>` を
  読まずに `/favicon.ico` を直接取りに来る経路のために残してあり、印を差し替えるときは 3 つを揃える。
  ホーム画面のアイコンは角を丸めない —— 置く側が自分の形に切り抜くため、二重に削れる
- **`ImageResponse` の既定の書体はラテンの字しか持たない。** 和文を含む文字列を描くなら、書体を
  持ち込む判断を絵を決めるときに一緒に行う。root の OG 画像がサイトの名だけを描くのはこのためである

### root layout が mount する島の作法

何を置くかは [`docs/spec/route/layout.function.md`](../../docs/spec/route/layout.function.md) が、供給と
送信面の置き場は [0031](../../docs/adr/0031-policy-state-supply.md) / [0082](../../docs/adr/0082-client-observability.md) /
[0131](../../docs/adr/0131-cookie-consent.md) が持つ。ここにあるのは島を書くときの形である。

- **要求の文脈を読む島は、殻の中では決まらない。** `traceparent` のように要求ごとに変わる値を器が
  取り出して渡すなら、その取り出しは `Suspense` の穴に閉じる。描くものを持たない穴だけが
  `fallback={null}` でよい（[0080](../../docs/adr/0080-error-handling.md)）
- **同意を尋ねる面と、同意を要する資材のゲートは 1 つの島にまとめる。** どちらも同じ同意状態を見ており、
  別々に置くと購読が 2 つになり、選んだ直後に片方だけが反応する瞬間ができる。ゲートの `children` に
  渡すのは同意が無ければ読み込んではならないものだけで、未同意の間は要素そのものを描かない —— 属性で
  無効にする形では、要素が存在する時点で取得が始まる資材を止められない。何を裏へ置くかは器が決め、
  判断の材料として示す文書の行き先も器が持つ（部品へ焼くと、文書を動かしたときに部品を書き換える）
- **同意ゲートの裏に置く第三者 script は動的に読む。** 静的に import すると、依存を外した配備（容器 ID を
  空にした側）の初期 JS にもライブラリのコードが載る。読み込んだ script は unmount で降りない（effect で
  `document.body` へ足すものも、`async` の `<script src>` も、React は資源として扱い外さない）ので、
  同意の取り消しは次の読み込みからしか効かない。読み込みの strategy を prop で選べないライブラリでは、
  いま効いている値をテストで固定し、既定が変わった時点で落ちるようにする
- **cookie から読んで第三者へ渡す値は、渡す前に形を確かめる。** `httpOnly` を付けられない cookie は
  書ける相手が居り、渡した先がその値をどう使うかはこちらの管轄外である。自分が出す値の形は自分で保証する
- **同意した直後に配られる値は、遷移のたびに拾い直す。** 前捌きが配る値は同意を書いた後の最初の要求から
  載るので、mount の 1 回では届かない。拾う部品に経路を `key` として渡して遷移ごとに作り直し、渡した
  値は module 変数に控えて同じ値を二度渡さない（部品の中に控えると作り直しのたびに消える）
- **ブラウザ側のシグナルを中継へ送る島は、送信を `adapters/client` に持たせ、計装は mount した後に
  動的な import で読む。** Web Vitals に載せる route は読み込みが始まった route、例外に載せる route は
  起きた時点の route（[docs/design/observability.md](../../docs/design/observability.md)）。
  1 回の読み込みで送る例外は上限で打ち切る —— 描画が投げ続ける壊れ方では同じ例外が毎フレーム上がる
- **横断通知の Provider は、画面本体を包む 1 要素の外へ置く**
  （[`docs/spec/route/layout.function.md`](../../docs/spec/route/layout.function.md)「横断通知はこの器の外へ置く」）

## boilerplate 導入時の変更点

**サイトの名乗りは `site.ts` が 1 か所で持ちます。** 初期化のコマンドはリポジトリの識別子を書き換え
ますが、ここは触りません。metadata・OG 画像・アイコンが同じ値を読むので、**書き換えないと自分の
サイトが本リポジトリの名前で名乗り続けます。**

| 何を | 既定 | 変更する箇所 |
| --- | --- | --- |
| サイト名 | リポジトリ名と同じ綴り。タイトルの雛形、OG 画像、各 layout の shell の header が読む | `site.ts` の `SITE_NAME`。**ラテンの綴りに限る** —— OG 画像を描く既定の書体が和文を持たず、画像の側だけが欠ける |
| サイトの説明 | 本リポジトリ自身を説明する文。root の `description` に載る | `site.ts` の `SITE_DESCRIPTION` |
| アイコンに描く印 | 1 文字 | `site.ts` の `SITE_MONOGRAM`。枠の大きさは描く側が決めるので 1 文字に限る |
| 書体 | 和文は OS 同梱のゴシック、見出しと等幅は同梱の欧文書体 | `fonts.ts` と [`tokens/README.md`](../../tokens/README.md#boilerplate-導入時の変更点) の両方。ラテンの字しか持たない銘の書体は和文を含む文字列に当てない —— 和文だけが次の書体へ落ち、1 つの語の中で書体が変わる。和文の Web フォントを `next/font` で足すなら費用を測り直す —— 番号付きスライスの `@font-face` がすべて、描画をブロックする CSS として載る |

外から見た origin と索引の可否は環境変数で、[`env/README.md`](../../env/README.md#boilerplate-導入時の変更点) が持ちます。`site.ts` が持つのは環境に依らない名乗りだけです。

同意ゲートの裏で読み込むタグマネージャを別のものへ替えるなら、`analytics.tsx` と配信ヘッダの
許可 origin（[`src/config/README.md`](../config/README.md#boilerplate-導入時の変更点)）の両方を
動かします。

## 運用

- **`route` の宣言が掛かるのは route segment の合成（`page.tsx` / `layout.tsx`）です**。
  **Route Handler（`api/**/route.ts`）は `integration` として扱います** ——
  [0090](../../docs/adr/0090-testing-strategy.md) の層別責務表が integration を「HTTP 境界のみ
  （`adapters` の API クライアント / route handler の境界）」と定めており、器の合成ではなく境界の
  検証だからです。実際の書き方も、モジュール境界を `vi.mock` で差し替え、応答の status と形を
  確かめる形になります

- **Server Action（`actions.ts`）は `unit` として扱います** —— 器の合成でも HTTP 境界でもなく、
  **値を返す対象**だからです（[0090](../../docs/adr/0090-testing-strategy.md) の軸は subject が
  何を返すかで決まり、`正常系` / `異常系` のコメント区切りで割ります）。書き方は、主体を断言する
  session と呼び先の adapter をモジュール境界で差し替え、**返した `ActionState` の分類・成立時の
  再検証・送り先**を確かめる形になります。HTTP の往復は adapter 側のテストが持つので、ここでは
  持ちません

- **受け口の本体を隣へ出したモジュールは `unit` として扱います** —— `route.ts` / `actions.ts` が
  薄い口に留まり、判断と組み立てを隣のモジュールへ委ねた場合、そのモジュールは呼び出し元を問わず
  `unit` です。判定は**応答（`Response` とステータスコード）の組み立てを持つかどうか**で、持たずに
  値を返すならこちらに当たります（`dev/session/authorize-development-session.ts`）。`Request` を
  引数に取るかどうかでは決まりません —— 受け取っていても、返すのが値なら軸は
  `正常系` / `異常系` です。隣へ出す形は、Route Handler が `features` を引けないのに転送先が feature
  の語彙（失敗の分類）で決まるときに要ります —— 隣のモジュールが判別可能 union で転送先まで組んで返し、
  `route.ts` は口を閉じることと HTTP の形へ直すことだけを持ちます。POST を受けて別の場所へ送る応答は
  303 にします（302 のままだと、戻した先をブラウザが POST で開き直しうる）。本体の大きさの上限も
  受け口が自分で持ちます —— `next.config.ts` の `bodySizeLimit` は Server Action にしか及びません

- **Server Action の形は同じです。** ファイルごとに断言の補助（`assertXxx`）を 1 つ持ち、export する
  action の先頭で呼びます。断言に失敗したら**投げずに `ActionState` として返します**
  （`actionStateFromError`）—— 失敗は操作の隣に出すもので、境界へ抜けさせません。続いて feature の
  parser で送信を解き、`adapters/server` を呼び、結果を返します。項目ごとの誤りがあるときは全体の文言を
  出しません（要約が同じことを言い、同じ指摘が 2 か所に並ぶ）。カタログの既定文言は分類しか伝えないので、
  拒まれた理由がその画面でしか言えないとき（版の競合、進行中の関連が残っている）だけ画面固有の文言を
  当てます。成立した後にどこへ送るかは 3 通りです:
  - **`redirect()` で一覧へ送る** —— 同じ画面に留まると押し直しが二重の作成・二重の更新になり、成立した
    後なので取り消せないとき
  - **`revalidatePath()` で取り直させて留まる** —— 成立した行が一覧に残ると、押せば必ず競合になる操作が
    並び続けるとき。途中で打ち切っても 1 件でも通ったら取り直させます（打ち切りの理由を伝えることと、
    成立した分を一覧へ映すことは別の話）
  - **何もせず留まる** —— 結果整合で後始末が続き、直後に取り直しても「まだ反映されていない一覧」を
    見せるだけのとき。何が起きたかは送信の結果が伝えます
  複数件を順に送る action は並行にしません —— 途中で拒まれたとき、どこまで通ったかを数えられなく
  なります。いまの状況で通らなかった 1 件は数えて先へ進み、次の 1 件でも同じように起きる失敗（役割が
  無い・接続先が落ちている）では止めます。1 件も通らなかったときだけ失敗にします

- **`route` のテストは、穴の中身ではなく「どの穴へ何を差したか」を確かめます。** 穴の中身は取得を
  待つ Server Component で、client の描画器では解決できません。中身は目印へ差し替え（`vi.mock`）、
  中身そのものの検証はその部品のテストに持たせます。待機表示の見え方は、解決しない Promise を返す
  中身で固定します。shell を描く器は `next/navigation`（`usePathname` / `useRouter`）の供給を要します。
  root layout は `html` / `body` を描くので `renderToStaticMarkup` で見ます。module の評価時に決まる
  `metadata` は、設定の差し替えを変えたら `vi.resetModules()` で読み直します

- 層をまたぐ import は `@/*` alias を使う
- 役割を示さない `common`、`shared`、`utils`、`lib` 等の置き場は作らない
- 単一 feature 専用のコードは `features/<name>/` に置く
- 横断 UI と Provider を mount してよいのは `layout.tsx` だけで、`page.tsx` は feature のみを呼ぶ。mount は**配置だけ**を意味し、layout で hook を呼んでデータを組むことは含まない
- root layout は横断通知の Provider を mount する。通知を出す側は `useToast()` を呼ぶだけでよく、queue の state も dismiss の配線も持たない。ただし 1 画面で完結する表示状態を、ここを経由してグローバルへ持ち上げない
- metadata は Metadata API で宣言する。`<head>` の手書きと `next/head` は使わない。土台と差分の割り当ては「metadata の土台と差分」が持つ
- **route segment は描画の span を持たない。** Next.js が `render route (app)` を張るので、同じ範囲を二重に持たない。画面の中の帰属は feature 層の最上位が持つ（[observability/README.md](../observability/README.md)）
- **shell は root layout ではなく route group の `layout.tsx` が敷く。** root が持つのは `html` / `body` と Provider の mount だけで、器の選択はその下の段が行う。見せる相手が違えば shell を分け、描く時点が違えば（配下を build 時の姿だけで配りたい）器が cookie にもバックエンドにも触れないところまで下がる —— その器には request 時に読む導線（主体で決まる入口）は出ず、出さない側が安全側になる。器の分け方と、route group が client 状態の境界でもあることは [0026](../../docs/adr/0026-layout-shell-mount.md)
- **器の隣に置く journey 内の Provider は、その journey の外へ出た時点で状態を失ってよいものに限る**（[0026](../../docs/adr/0026-layout-shell-mount.md)）。中身が空になると畳む器の外へ置く —— 器の内側に持つと、中身が空になって器が畳まれた時点で記憶ごと失われる
- **`globals.css` が持つのは import の束ね・`dark` variant・系統ごとの書体の当て直しだけ。** `dark` の発火条件は tokens の生成側と揃える必要があり、条件の正本は [`tokens/README.md`](../../tokens/README.md)。`[data-surface]` で `font-family` を当て直すのは、継承する値であり変数を差し替えただけでは部分木に届かないため
- **`FONT_VARIABLES` は `<html>` とカタログの story の双方が同じ定義を使う。** `next/font` は変数の宣言を class に載せるので、変数を読む要素の祖先に必ずこの class が要る
- **開発専用の入口（`page.dev.tsx` / `route.dev.ts` / その action）は入口ごとに環境の判定を呼ぶ**（[0113](../../docs/adr/0113-development-access-surface.md)）。route group の外に置くので `main` は自分で置く

## 監査の観点

| 観点 | 判定の形 | 根拠 |
| --- | --- | --- |
| `forbidden: business-logic` — どの element も、契約が返さない値の計算・業務の判定・重い集約を持たない。`error.tsx` / `not-found.tsx` / `loading.tsx` も同じ | violation。持っているのが表示のための整形か業務の判定かが読み分けられないときは suggestion | [0021](../../docs/adr/0021-frontend-responsibility.md)「カーネル受入基準」4 / [0025](../../docs/adr/0025-app-layer-elements.md) 禁止事項 / [0070](../../docs/adr/0070-backend-role-separation.md) 禁止事項 / [0080](../../docs/adr/0080-error-handling.md) 禁止事項 |
| `forbidden: direct-fetch` — route segment は `fetch` も `adapters` の取得の口も呼ばない。取得は feature が持つ。例外は入口の保護（`adapters/server/auth` の `verifySession()` を呼び、`model` の述語で判定し、`redirect()` する）だけ。Route Handler も生の `fetch` を持たず `adapters` を通す | violation | [0021](../../docs/adr/0021-frontend-responsibility.md) 依存マトリクス / [0025](../../docs/adr/0025-app-layer-elements.md) element 表と禁止事項 / [api/README.md](api/README.md)「受け入れないもの」 |
| route segment の `observability` は計装の mount だけ —— root layout がアクティブな span の trace 相関を取り出し、mount する client component へ渡す。span を作る・記録する用途で引かない | violation | [0021](../../docs/adr/0021-frontend-responsibility.md) 依存マトリクスの注記 / [0025](../../docs/adr/0025-app-layer-elements.md)「import 先の集合として書けないもの」。機械は届かない（`route-segment` は要素として宣言していない） |
| route segment が直に読む `config` は、Next.js の規約が route segment に置くことを要求する値だけ（metadata が読む `config/site`、画面が「いま」として読む `config/clock`）。それ以外の `*.server.ts` を route segment が import しない。本番の束に載らない `page.dev.tsx` の直読は 0025 が記録する既知の形で、対象外 | violation | [0021](../../docs/adr/0021-frontend-responsibility.md) Enforcement / [0025](../../docs/adr/0025-app-layer-elements.md) 禁止事項 / [config/README.md](../config/README.md)「運用」。機械は届かない |
| Server Action（`src/app/**/actions.ts`）は、export する action ごとに内側で `adapters/server/auth` の断言を呼ぶ。描画した画面が保護されていることに依拠しない | 呼び出しが無ければ violation。呼んでいるが、役割・所有の判定として足りているかは suggestion | [0025](../../docs/adr/0025-app-layer-elements.md) 禁止事項 / [0021](../../docs/adr/0021-frontend-responsibility.md)「Server Action の置き場」/ [docs/rules.md](../../docs/rules.md)「認可と入口」 |
| Server Action は `server config`（`*.server.ts`）を読まない。`NEXT_PUBLIC_` の公開定数（`*.client.ts`）は読んでよい | violation | [0025](../../docs/adr/0025-app-layer-elements.md) 禁止事項と「この表のどこまでが機械で強制されるか」。機械は `config` を層の粒度でしか見ず、この区別は届かない |
| Route Handler は中継と入出力の検証だけを持つ薄い proxy で、Node runtime に留まる。分類から status と本文を組むのは `adapters/server/http` の口で、handler の中で組み立てない | runtime の宣言を変えていれば violation。応答を handler の中で組み立てていれば suggestion | [0025](../../docs/adr/0025-app-layer-elements.md) element 表 / [docs/rules.md](../../docs/rules.md)「層境界と依存」/ [api/README.md](api/README.md)「失敗の返し方」 |
| route segment の器（`layout` / `page` / `template` / `default`）に `"use client"` を置かない | violation | [docs/rules.md](../../docs/rules.md)「層境界と依存」。機械: ESLint `no-restricted-syntax`（`eslint.config.ts`） |
| 横断 UI と Provider を mount するのは `layout.tsx` だけで、mount は配置だけを意味する。`page.tsx` は feature を呼ぶだけで、layout は hook を呼んでデータを組まない | violation | [0026](../../docs/adr/0026-layout-shell-mount.md) 禁止事項 / この README「運用」 |
| segment config（`dynamic` / `revalidate` 等）を持たない。殻を配れない画面だけが `export const instant = false` を名乗る | violation | この README「この層が持つ判断」/ [0041](../../docs/adr/0041-cache-components-decision.md) |
| metadata は Metadata API で宣言し、`<head>` の手書きと `next/head` を使わない。各 segment は「metadata の土台と差分」の表が定める差分を宣言する | 手書きの `<head>` / `next/head` は violation。表が求める差分（`alternates.canonical`、認証の要る画面の `robots`）の欠落は suggestion | この README「metadata の土台と差分」「運用」/ [0044](../../docs/adr/0044-seo-metadata-strategy.md) |
| 器（`page.tsx` の default export）は `params` / `searchParams` / cookie / 実時計を await せず、穴（`Suspense` の内側の async component）で解く。器で待つのは `instant = false` を理由つきで名乗った画面だけ | 宣言なしに器で待っていれば violation | この README「殻と穴の定型」/ [docs/rules.md](../../docs/rules.md)「描画とキャッシュ」/ [0041](../../docs/adr/0041-cache-components-decision.md)。機械: `scripts/render-mode` が宣言と prerender の結果を突き合わせる |
| `error.tsx` / `not-found.tsx` / `global-error.tsx` は文言を `errors` のカタログ（または `boundary-feedback.ts`）から採り、`error.message` を出さず、自分で組まない | `error.message` を描く、境界の中で文言を組む、はいずれも violation | この README「失敗と不在の面の作法」/ [0080](../../docs/adr/0080-error-handling.md) の、エラーの特殊ファイルを正規化済みの文言だけを出す薄い境界にする決定。機械は届かない —— 各境界のテスト（生の本文を出さないこと）が固定する範囲まで |

## 関連する ADR

この層のコードが依存する決定です。**コメントからは ADR を直接指さず、この節を辿ります** ——
ADR は番号も節も動くので、動いたことに気づける場所を 1 つに寄せています（[docs/rules.md](../../docs/rules.md)
「コメントと文書」）。要素ごとに依存先が違うので、要素で分けます。

### 層全体

- [0025](../../docs/adr/0025-app-layer-elements.md) — この層の element（route segment / route handler / server action / metadata）と、それぞれが持てるもの
- [0090](../../docs/adr/0090-testing-strategy.md) — 層別の検証責務（`route` / `integration` / `unit` の割り当て）

### route segment（`page.tsx` / `layout.tsx` / `error.tsx` / `not-found.tsx`）

- [0040](../../docs/adr/0040-routing-rendering-strategy.md) — App Router の採用と、描画のモードを boilerplate として強制しないこと
- [0041](../../docs/adr/0041-cache-components-decision.md) — Cache Components（PPR）の採否。殻と穴の分け方
- [0026](../../docs/adr/0026-layout-shell-mount.md) — 横断 UI と Provider を mount してよいのは layout だけ
- [0079](../../docs/adr/0079-auth-frontend-seam.md) — 入口の前捌きと、画面で通す確定認可の置き場
- [0112](../../docs/adr/0112-data-classification-cache-boundary.md) — 主体に紐づく値をキャッシュ境界のどちら側へ置くか
- [0080](../../docs/adr/0080-error-handling.md) — 失敗と不在の面（`error.tsx` / `not-found.tsx`）の責務
- [0113](../../docs/adr/0113-development-access-surface.md) — 開発専用の route（`page.dev.tsx`）が build に含まれる条件と、入口ごとの判定

### route handler（`dev/**/route.dev.ts`）

`api/` の下は [api/README.md](api/README.md) が持ちます。

- [0029](../../docs/adr/0029-type-design-discipline.md) — 境界での parse と、返す値の型の規律
- [0075](../../docs/adr/0075-file-upload-seam.md) — 受け口が本体を受け取るときの seam
- [0080](../../docs/adr/0080-error-handling.md) — 分類から status への対応
- [0113](../../docs/adr/0113-development-access-surface.md) — 開発専用の入口が閉じているときに 404 を返すこと

### server action（`actions.ts`）

- [0025](../../docs/adr/0025-app-layer-elements.md) — 主体の断言が要る action をこの層へ置く判断（`app/server-action`）
- [0075](../../docs/adr/0075-file-upload-seam.md) — アップロードの seam。受け口が最後の関所になること

### metadata（`sitemap.ts` / `robots.ts` / `icon.tsx` / `apple-icon.tsx` / `opengraph-image.tsx` と各 segment の宣言）

- [0044](../../docs/adr/0044-seo-metadata-strategy.md) — Metadata API の使い方、索引の可否と canonical
- [0045](../../docs/adr/0045-fonts-and-images.md) — 書体と画像の方針（OG 画像を含む）

### root layout が mount する島（`telemetry.tsx` / `consent.tsx` / `analytics.tsx`）

- [0031](../../docs/adr/0031-policy-state-supply.md) — 同意 / feature flag の状態をどこが供給するか
- [0082](../../docs/adr/0082-client-observability.md) — Web Vitals と client 例外の収集、送信面の置き場
- [0131](../../docs/adr/0131-cookie-consent.md) — 同意管理を採らない決定
- [0077](../../docs/adr/0077-bff-abuse-protection-boundary.md) — 認証を要求しない受け口の防御をどこが持つか
