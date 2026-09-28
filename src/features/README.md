---
imports-allowed: [model, components, adapters, capabilities, stores, errors, logging, observability] # 生成物。`pnpm gen:architecture` で直す
forbidden: [features]
test-requirement: [feature, component, unit]
---

# features

画面単位の機能スライスです。各 `features/<name>/` に画面ユースケース、専用 UI、hook、Server Action をフラットに共置します。

## 受け入れるもの

- データ取得の編成、複数 API の集約、フォーム送信フロー、楽観更新
- その feature 専用の UI、hook、`actions.ts`

## 受け入れないもの

- 他 feature への直接依存
- 複数 feature で共有すべき要素、バックエンドの業務ロジック

## slice の一覧

**この層の役割論はここが持ち、各 slice の README はそれを再掲しません。** 子が書くのは、その
slice に固有の線引きと、契約・仕様・デザインへの索引です。雛形は
[feature README テンプレート](../../docs/templates/feature-readme.md) が持ちます。
`pnpm gen feature <name> --screen=<画面>` は、feature が無ければ README ごと、既に在れば画面の
ディレクトリだけを足し、止まるのは `<name>/<画面>/` が既に在るときだけです。

| slice | 役割 | README |
| --- | --- | --- |
| `auth/` | 身元を預ける入口。認証そのものは持たず、BFF の口へ渡す | [README](auth/README.md) |
| `dev-session/` | 開発時に主体を差し替える面。本番の束には載らない | [README](dev-session/README.md) |
| `maintenance/` | 配信を止めているあいだ、全ルートの代わりに見せる面 | [README](maintenance/README.md) |

<!-- sample:begin -->
同梱のサンプルが加えるもの:

| slice | 役割 | README |
| --- | --- | --- |
| `home/` | 入口の面。複数の取得を並べ、片方の失敗で全体を落とさない | [README](home/README.md) |
| `products/` | 題材を探して眺める。条件を URL に載せ、増分で読み進める | [README](products/README.md) |
| `cart/` | 買う前の入れ物。他 slice へ操作の口を facade で貸す | [README](cart/README.md) |
| `checkout/` | 確定の手前。カートと届け先を突き合わせ、1 回だけ送る | [README](checkout/README.md) |
| `purchases/` | 確定したものの履歴と 1 件の詳細、そこからの状態遷移 | [README](purchases/README.md) |
| `account/` | 自分の記録。登録・編集・退会と、自分向けの集計 | [README](account/README.md) |
| `inquiry/` | サポートとのやり取り。届いた 1 通が取り直しを待たずに並ぶ | [README](inquiry/README.md) |
| `admin/` | 役割を持つ主体だけが入る運用面 | [README](admin/README.md) |
| `site-info/` | 取得を持たない静的な面 | [README](site-info/README.md) |
<!-- sample:end -->

## slice の中の語彙

掘り方の 2 軸（画面 × 性質）と、`page-content` / `view` / `ui/` / `facade/` の意味は
[0027](../../docs/adr/0027-directory-structure.md) が持つ。**ここが持つのは、その下で同じ名前が同じ
役割を負う module の一覧** —— どの slice でも綴りと持ち物を揃える語彙 —— である。名前が揃っていれば、
開かずに「何を呼べて、何で検証されるか」が決まる。部品を `ui/` に置くか `components` へ上げるかの
分岐は [`docs/design/placement.md`](../../docs/design/placement.md)、手を動かす順は
[画面を 1 つ作る tutorial](../../docs/tutorial/build-a-screen.md) が持つ。

| module | 持ち物 | 持たないもの |
| --- | --- | --- |
| `<screen>/page-content.tsx` | URL の解釈、条件で変わらない取得、待機の境界の配置、`not-found` の分類、1 回きりの送信に載せる冪等キーの発行 | 見た目 |
| `<screen>/results.tsx` | 条件で変わる取得だけ。`page-content` が置いた `Suspense` の内側に居て、取り直す範囲を区切る | 操作面（検索欄・絞り込み・効いている条件の表示） |
| `<screen>/view.tsx` | props だけで描ける画面の合成。`page-content` が取った値を受けて組む | 取得 |
| `<screen>/breadcrumb-content.tsx` | 現在地までの階層。app 層の `@breadcrumb` slot が置く。名前のために本文と同じ取得を通ってよい —— 同じ描画の中で 1 回に畳まれる | |
| `<screen>/ui/<part>/` | その画面の部品。1 部品 1 ディレクトリで、実装・test・stories を共置する | 他の画面からの参照（2 つ目の画面が要れば 1 段上へ） |
| `ui/skeleton/` | 待機表示。実物と同じ段組みで、枠の数は 1 画面に収まる固定値。`aria-hidden` | 実データの件数との一致 |
| `ui/submit-button/` | `useFormStatus` を読む送信の操作。`form` を描く component の**子**として切り出す | |
| `ui/error-state/` | 取得に失敗したときの表示。描くのは route の `error.tsx` | 文言の組み立て（分類から `errors` が引く） |
| `query.ts` | URL のキーの綴り、行き先の組み立て、いま見ている場所の型 —— **組む側** | `searchParams` を読むスキーマ |
| `read-<対象>.ts` | `searchParams` を zod で読む側。読めない値を既定へ倒すか、キーを名指しして返すかはここが決める | 行き先の組み立て |
| `page-size.ts` | 1 度に並べる件数。条件の解釈から切り離す —— client が引いても検証ライブラリを連れて来ない | |
| `paths.ts` | この feature が所有するルートの綴りと組み立て。画面を挟まず直下。他 feature が指すなら `facade/paths/` へ出す | 他 feature が所有するルートの写し |
| `actions.ts` | Server Action。編成と分類だけ | 業務ロジック、`FormData` の解き方、文言 |
| `form-names.ts` | `FormData` の項目名の宣言。送る側と読む側が同じ綴りを引く。**検証を持たない** —— 入力欄が要るのは綴りだけで、受け取る側の検証を連れて来ない | |
| `parse-<対象>-form.ts` | `FormData` を型へ解く境界。読めなければ `null`（空文字を数へ変換しない —— `Number` は欠落も空文字も `0` と読む）。受け付ける範囲は契約が拒む | |
| `form-state.ts` | `ActionState<T, Field>` をこの画面の項目名で閉じた型、app 層から受け取る Action の型、この画面でしか言えない文言 | |
| `<範囲>.fixture.ts` | story と test が読む固定値。`satisfies` で表示モデルに合わせ、画像は `~catalog/lib/sample-asset` から取る。長い名前・画像の無いもの・事情の立ったものを混ぜ、器の幅と分岐が story に現れるようにする | 判定 |
| `__mocks__/actions.ts` | カタログでの Server Action の差し替え。`fn(async () => succeededActionState(...))` に `.mockName` を付ける | 本番経路からの import |
| `facade/<part>/` | 他 feature に貸す面 —— ルート、URL 契約、題材の語彙を持つ UI、他 feature から起こす Action と、その `__mocks__` | feature 内部への参照（`architecture.ts` の `features-facade` が止める） |
| `use-<対象>.ts` | 状態や購読を伴う方針。hook に切るかどうかの基準は [0021](../../docs/adr/0021-frontend-responsibility.md)「feature 内で部品を分ける基準」 | 純粋な計算（関数で足りる） |

- **画面が 1 つの間は `<screen>/` を省いて直下へ置いてよい**（[0027](../../docs/adr/0027-directory-structure.md)）。
  `pnpm gen feature` は最初から画面ディレクトリを掘る —— 2 つ目の画面が来たときに 1 つ目を移す
  作業を無くすためで、2 つ目以降も同じ `--screen` で足す
- **入れ子の README（`<name>/<resource>/README.md`）は `test-requirement` と `coverage-exclusions`
  だけを宣言し、`imports-allowed` / `forbidden` を持たない。** 境界は要素の根に付き、宣言できるのは
  `<name>/README.md` だけである（`scripts/architecture/readme-scan.ts` が落とす）
- **`coverage-exclusions` には `__mocks__/**` と `*.fixture.ts` を並べる。** 除外の理由と撤去条件は
  `scripts/lib/untested-modules.ts` の宣言が持ち、README が持つのは並びだけである
  （[0090](../../docs/adr/0090-testing-strategy.md)）

## 取得と待機の境界

**条件で変わるものと、変わらないものを分ける。** `page-content` が取るのは条件に依らないもの
（絞り込みの候補、マスタ）で、条件で変わる一覧と件数は `results` が持つ。`results` を包む
`Suspense` には**条件を直列化した鍵**を与える —— 条件が変われば一覧は総入れ替えで、鍵が無いと
次の一覧が届くまで前の条件の一覧が残る。分けないと、条件を 1 つ変えるたびに操作面ごと待機表示へ
落ち、続けて絞り込む足場が消える。

```tsx
<XxxListView selection={selection}>
  <Suspense fallback={<XxxListSkeleton />} key={serialize(selection)}>
    <XxxListResults query={parsed.query} />
  </Suspense>
</XxxListView>
```

- **穴の内側の client island には、中身から作った `key` を渡す。** 読み進めた分は island の state
  にあり、props が変わっても入れ替わらない。中身から鍵を作れば、取り直したときだけ積み直り、
  変わっていなければ読み進めた位置が保たれる
- **待機の境界は、同時に届くものにつき 1 つ。** 同じ要求で届くものを別々の `Suspense` へ割ると、
  画面が二度継ぎ足されて読み始めた位置が動く。同じ取得を外枠と本体が読んでも、取得の口が要求の中で
  memo 化されていれば往復は増えない
- **本体でない取得の失敗は値へ倒し、記録だけ残す。** 件数・参考値のような添え物は `.catch` で
  `undefined` へ倒して `reportQuietly(() => getLogger().warn(...))` に残し、本体の失敗はそのまま投げて
  route の `error` 境界へ渡す。互いに依存しない系統をどれも本体として出すなら `Promise.allSettled`
  で受け、系統ごとの状態（`ready` / `failed`）へ写して `view` に渡す —— `Promise.all` は最初の失敗で
  待機を打ち切り、成功した系統の結果が手元にあっても使えない
- **`not-found` の分類は `page-content` が受ける。** 取得の失敗を `findAppError` で分類し、
  `NOT_FOUND` なら `notFound()`、それ以外は投げ直す。見つからない面を描くのは route の
  `not-found.tsx` で、この層は分類だけを持つ
- **待機の境界は `loading.tsx` ではなく `Suspense` で置き、置く場所は 2 つある。** route の
  `page.tsx` が `page-content` ごと包む形と、`page-content` が `results` を包む形で、後者は操作面を
  待機の外に残したいときに採る。前者では `params` / `searchParams` を promise のまま穴の内側で解く
  （器の側で待つと、待っている間は殻すら配れない）

画面の 4 状態（[docs/rules.md](../../docs/rules.md)「状態表示と待機」）の持ち主は次の表で決まり、
**この層が持つのは表示の部品だけ**である。

| 状態 | 持ち主 | この層に在るもの |
| --- | --- | --- |
| loading | `Suspense` の fallback | `ui/skeleton/` |
| empty | `view`（「まだ無い」と「絞った結果が無い」を分ける） | `ui/empty/` か `view` の分岐 |
| error | route の `error.tsx` | `ui/error-state/`。文言は境界が `errors` から引いて渡す（production では `digest` しか届かない） |
| not-found | route の `not-found.tsx` | 分類だけ（`page-content`） |
| 操作の失敗 | `ActionState` | その操作の隣に出す部品。画面の状態にはしない |

**取得を持たない画面は loading / empty / error を持たず、README に「持たない理由」を書く。** 状態が
1 つしか無いなら画面まるごとの story も置かず、見た目は E2E の画面比較が受け持つ —— 置いても
`Default` 1 本になり、VRT の実行時間だけが伸びる。

## 送信の形

`<form action>` + Server Action + `ActionState` の正機構は [0061](../../docs/adr/0061-form-mutation-ux.md)、
Action の置き場は [0021](../../docs/adr/0021-frontend-responsibility.md)「Server Action の置き場」、
冪等キー・409・確認 dialog の規則は [docs/rules.md](../../docs/rules.md)「フォームと送信」が持つ。
ここが持つのは、それを slice の中でどう割るかである。

1. 入力欄は `form-names.ts` の綴りで `name` を付ける
2. Action は `parse-<対象>-form.ts` で `FormData` を解く。解けなければ `failedActionState({ formError })`
   —— 文言はその画面の定数で、「画面を読み込み直す」を促す
3. `adapters` を呼び、失敗は `actionStateFromError` で分類へ写す
4. 成立したら `revalidatePath` か `redirect`。**値が外枠（header・脇の領域）にも出るなら経路 1 つの
   無効化では外枠が古いまま残る** —— `revalidatePath("/", "layout")` を、`project-rules/no-app-wide-revalidate`
   の抑止に理由を添えて使う

- **成功値は「成功した状態が画面に現れるか」で決める。** `redirect` する送信と、同じ往復で再描画される
  Server Component が結果を出す送信は `ActionState<void>`。成立した時点で対象が一覧から消えていて
  結果の文言が対象を名指しする必要があるときだけ、成功値に呼び名を持つ
- **app 層に住む Action は route が props で渡し、その型を `form-state.ts` が持つ**
  （`(state, formData) => Promise<State>`）。画面は送信先を自分で決めない —— 決めてよいのは
  `adapters/server/auth` へ触れられる app 層だけである
- **冪等キーの発行元は送信の回数で決まる。** 1 回きりの作成（登録・確定）は `page-content` が組み立て
  ごとに 1 つ作って props で渡す。同じ画面から繰り返す送信（1 通ずつ送るもの）は client island が
  `useState(newIdempotencyKey)` で持ち、**成立したときだけ作り直す**。設定（PUT）と削除は 2 度届いても
  結果が変わらないので鍵を持たない
- **競合（409）だけ言い分ける。** 押した人が取れる行動（画面を読み直す）が他の失敗と違う
- **確認の中で送る操作は、送信中も失敗時も dialog を開いたままにする。** 押した時点で閉じる部品
  （`AlertDialogAction`）を使うと、送信中の表示も失敗の文言も利用者が見ていない場所に出る

## 描画を span に載せる

エクスポートを `observability` の 2 つで包む。**どちらで包むかは置き場で決まる。**

| 置き場 | 使うもの | 既定 |
| --- | --- | --- |
| 画面の最上位（`<screen>/page-content` / `<screen>/view`、および殻の側で取得を持つ合成） | `withScreenSpan` | 有効 |
| `<screen>/ui/**` | `withPartSpan` | 無効（`OBS_RENDER_SPANS=part` で開く） |

```tsx
export const XxxPageContent = withScreenSpan(
  "features/<name>/<screen>/page-content",
  async ({ id }: XxxPageContentProps) => {
    // 取得と組み立て
  },
);
```

**殻と穴に割れた画面は、最上位が 2 つ以上になる。** Cache Components 有効下では、待たずに配れる節を
`Suspense` の外へ出すことがある。出した側も取得を持つ画面の最上位なので `withScreenSpan` で包み、
span 名はその module のパスに揃える —— 1 つの route に最上位の span が複数立つことになるが、それは
殻と穴が別々に解決されるという事実そのものである。

仕組みと span の読み方は [observability/README.md](../observability/README.md) が持つ。

- **名前は `src/` からのモジュールパスと一致させる。** span 名がそのまま置き場を指すので、ずれると trace からファイルへ戻れない。利用者の入力を混ぜない
- **client component（`"use client"` を持つファイル）は包まない。** ブラウザでの描画では span を作らないため、包んでも得られるのは server 描画の 1 回分だけである
- **取得を持つ側を包むと帰属が付く。** `page-content` が待つ通信はその span の中に入るので、外向きの `fetch` を画面へ結び付けられる
- **部品は常用しない。** `part` を開けると 1 描画の span が描く部品の数だけ増える。値打ちが出るのは、分岐した結果——どの姿を返したか——を trace から読みたいときである

## カタログに載せる

画面は `Page/`、部品は `Features/` に置く（先頭セグメントの決まりは
[`components/README.md`](../components/README.md)）。**`<screen>/ui/**` と `facade/**` の描画する部品は、
すべて自分の story を持つ。** 画面の story から届く状態であっても持つ —— 画面は部品を 1 つの姿で
しか通らないので、部品が表せる残りの状態（帯ごとの幅・契約上の最大長・送信中・拒まれた結果）は
そこに現れない。

story を持てないのは**ブラウザで描けない部品だけ**である。`server-only` を辿る取得を中に持つ
async な合成がそれにあたる。持てない理由と、中身がどこで見られるかを本体の doc に書く。
**そこへ寄せないように分ける** —— 取得を持つ合成と見た目を持つ部品を分け、状態を props で受ける側に
story を持たせる。1 つに束ねると、見え方を確かめるのに取得が要る部品が残る。

- **`title` の体系は [`components/README.md`](../components/README.md) が持つ。** 所有者はそこ 1 か所
  なので、ここには写さない
- **画面の story は route と同じ器で包む decorator を持つ。** shell・読み幅・見出しを `page.tsx` と
  同じ部品で再現し、`layout: "fullscreen"`、docs は `inline: false` に `iframeHeight` を添える。
  帯ごとの姿は story ごとに `globals.viewport` で固定する。器が持つ横断 UI（脇の領域など）を画面の
  story に足すかは、実物に同じ並びがあるかで決める
- **現在地を読む部品（nav の `aria-current` など）を含む story は `parameters.nextjs.navigation.pathname` を与える**
- **`@see Storybook` は自分の story を指す。** 画面の story を指していると、その部品を直す人が
  確かめる先を見つけられない
- 送信中は解決しない送信先（[`~catalog/lib/pending-action`](../../.storybook/lib/pending-action.ts)）で
  留める。すぐ返る送信先では、撮る前に送信が終わっている
- Server Action を直に読む部品は、`.storybook/preview.tsx` の差し替え宣言に載せる。載せないと、
  押した先で `config` の読み込みに落ちる。**失敗の見え方は story の `beforeEach` で
  `mocked(action).mockResolvedValue(failedActionState(...))` と差し替える** —— 失敗は props では
  作れない
- 入力の状態を外から受ける部品は、本物の hook を通した器で包む。差し替えると label と control の
  対応まで偽物になり、カタログで確かめられるものが無くなる
- 成立と同時に別の URL へ送る Action の代役は、**成功を返してその場に留まる**。実物では成功の状態が
  画面に現れないが、カタログには送り先が無い。実物と違って留まることを代役の doc に書く
- story ごとに違う値を要る器は、decorator ではなく args を受ける component にする。器の値が story の
  args として型のまま扱える。decorator にすると器の値は部品の args の外に居て、`parameters` で運ぶ
  ことになり型が残らない
- overlay の探し方や docs ページの分け方など、**カタログの器そのものに由来する決まりは
  [`.storybook/README.md`](../../.storybook/README.md) が持つ**

## テストの取り方

手段は [0091](../../docs/adr/0091-test-verification-methods.md)（async RSC は `render(await X(props))`）、
書き方は [docs/testing-conventions.md](../../docs/testing-conventions.md) が持つ。この層で繰り返す形は
次の 3 つである。

- **`page-content` のテストは境界を見る。** `adapters` を `vi.hoisted` + `vi.mock` で差し替え、
  `results` は目印を返す stub に置き換えて、条件で変わるものが待機の境界の内側に置かれたことと、
  URL から契約へ写した条件（`toHaveBeenCalledWith`）を見る。取得の失敗は「握り潰さず境界へ渡す」
  ことを `rejects` で見る
- **`view` のテストは fixture を props に渡す。** 状態ごとに描き、a11y は `axe` で見る。Server Action
  の module は `vi.mock` で `vi.fn()` に差し替える
- **値を返すもの（`parse-*` / `read-*` / `query` / `paths` / hook）は `unit`。** 描画を持たず、戻り値と
  分岐を直接照合する

## 運用

- 横断利用が必要になった要素は責務に応じて `model`、`components`、`adapters`、`capabilities`、`stores` へ昇格する
- Server Action は編成だけを担い、業務ロジックを置かない
- feature の根（`features/<name>/README.md`）は同じ frontmatter を持つ README を置く。入れ子の
  README が宣言できるものは「slice の中の語彙」の末尾にある
- **コードのコメントから ADR を参照しない。** 参照は README に集め、コメントは「置き方は同 feature の
  README」のように隣から辿れる形で書く（[`docs/rules.md`](../../docs/rules.md)「コメントと文書」）。
  ADR は番号も節も決定の所在も動くが、README は層と一緒に動くので、動いたことが参照側へ波及しない ——
  コメントが直接指していると、参照はコード側に散り、ADR からは誰が指しているか見えないまま腐る
- **宣言は `test-requirement: [feature, component, unit]` の並びで、slice が 3 つの形を抱えることを書く。**
  `feature` が掛かるのは画面の単位で組み上げたもの（`page-content` / `view` /
  `results` / 殻の側の合成）で、部品が揃って初めて成立する振る舞いを負う。**`ui/<part>/` の単一部品は
  `component` の形**——その部品 1 つの描画契約と a11y——で、**値を返す対象**（純関数、hook、Server
  Action の補助）は `unit` の形で確かめる。判別は手段ではなく合成の度合いで決める
  （[0090](../../docs/adr/0090-testing-strategy.md) 層別責務）。`feature` の 1 語だけを宣言すると
  feature の下の全ファイルへ一律に掛かり、React のツリーを要さない対象にまで合成の観点を課すことに
  なって、テストの側が正しいのに宣言と食い違う

## 監査の観点

| 観点 | 判定の形 | 根拠 |
| --- | --- | --- |
| `forbidden: features` — 他の feature の内側を import しない。通るのは相手の `facade/` と、画面まるごとの story だけ | violation | [0021](../../docs/adr/0021-frontend-responsibility.md)「`features ↔ features` 禁止と昇格ルール」。機械: ESLint boundaries（`architecture.ts` の `features-facade` / `feature-story`） |
| `facade/` に置いたものは、どのカーネルも受け取れないもの（特定ドメインの語彙を持つ UI、所有するルートの識別子と組み立て）で、2 つ目の feature が実際に使っている | カーネルへ昇格できる形のもの、使う feature が 1 つしか無いものは suggestion | [0021](../../docs/adr/0021-frontend-responsibility.md)「昇格できないもの — feature の `facade/`」 |
| 他の feature が所有するルートのパスや URL を書き写さず、所有者の `facade/` から取る | 相手の `facade/` が出している綴りと同じ文字列を書いていれば violation | [0021](../../docs/adr/0021-frontend-responsibility.md)「昇格できないもの」/ [docs/rules.md](../../docs/rules.md)「URL と条件」 |
| 複数の feature が同じ表示ロジック・UI・hook を別々に持たない。2 つ目が現れた時点で責務に応じたカーネルへ上げる | suggestion（同じ理由で変わるかは人が裁く） | [0021](../../docs/adr/0021-frontend-responsibility.md)「feature 内で部品を分ける基準」/ この README「運用」 |
| バックエンドの業務ロジックを持たない。契約が返さない値を計算して出さない | violation。表示のための整形か業務の判定かが読み分けられないときは suggestion | [0021](../../docs/adr/0021-frontend-responsibility.md)「カーネル受入基準」4 / [0070](../../docs/adr/0070-backend-role-separation.md) 禁止事項 |
| feature の `actions.ts` は編成だけを持ち、主体の断言が要らないものに限る。断言が要る変更は `src/app/**/actions.ts` に住む | 業務ロジックを持っていれば violation。主体に紐づく変更を断言なしで送っていれば suggestion | [0021](../../docs/adr/0021-frontend-responsibility.md)「Server Action の置き場」/ この README「運用」 |
| 画面の最上位（`page-content` / `view`、殻の側で取得を持つ合成）は `withScreenSpan`、`<screen>/ui/**` は `withPartSpan` で包む。span 名は `src/` からのモジュールパスと一致させ、利用者の入力を混ぜない。`"use client"` を持つファイルは包まない | 最上位が包まれていない、名前がパスと一致しない、client component を包んでいる、はいずれも violation | この README「描画を span に載せる」/ [docs/rules.md](../../docs/rules.md)「層境界と依存」 |
| `<screen>/ui/**` と `facade/**` の描画する部品は自分の story を持つ。持てないのはブラウザで描けない部品だけで、その理由と中身の見られる場所を本体の doc に書く | story が無く、doc にも理由が無ければ violation。取得を持つ合成と見た目を持つ部品が 1 つに束ねられていれば suggestion | この README「カタログに載せる」/ [0054](../../docs/adr/0054-ui-catalog-storybook.md) |

## 関連する ADR

**この層が依存する ADR はここに集める。** 各 slice が自分の分を持つので、ここに挙げるのは層そのもの
——受入基準・import 境界・共通の据え付け——が依存しているものだけである。slice 固有のものは
`features/<name>/README.md` の同名の節が持つ（雛形は
[feature README テンプレート](../../docs/templates/feature-readme.md)）。

- [0021](../../docs/adr/0021-frontend-responsibility.md) — 層の責務と import 境界。feature 間の直接依存を禁じ、貸すものは `facade/` に出す。Server Action の置き場
- [0027](../../docs/adr/0027-directory-structure.md) — `src/` の物理配置と co-location。画面ユースケース・専用 UI・hook・Action を `features/<name>/` へ共置する
- [0029](../../docs/adr/0029-type-design-discipline.md) — 判別可能 union と境界での parse。`FormData` と `searchParams` を型へ解く境界の置き方
- [0041](../../docs/adr/0041-cache-components-decision.md) — Cache Components（PPR）の可否。1 つの route に最上位の span が複数立つ根拠
- [0054](../../docs/adr/0054-ui-catalog-storybook.md) — カタログの方針。story を持つ範囲と、Server Action の差し替え宣言
- [0061](../../docs/adr/0061-form-mutation-ux.md) — `<form action>` + Server Action の正機構と `ActionState<T>`。`form-state.ts` が閉じる器
- [0080](../../docs/adr/0080-error-handling.md) — エラーの扱い。本体の失敗を境界へ渡し、添え物の失敗を値へ倒す線
- [0090](../../docs/adr/0090-testing-strategy.md) — 層別のテスト責務。`test-requirement` の各層が指す先と、fixture / `coverage-exclusions` の置き方
- [0091](../../docs/adr/0091-test-verification-methods.md) — 検証の方法。async RSC を `render(await X())` で描く根拠
