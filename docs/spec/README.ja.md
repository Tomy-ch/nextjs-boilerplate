> **このファイルは [`README.md`](README.md) の日本語訳です。**
> 直接編集しないでください。変更は英語の canonical な `README.md` を先に更新し、そのうえでこの日本語訳を同期してください。
> エージェントが読むのは `README.md` だけです。このファイルは人間が読むための翻訳です。

# 仕様

**実装が何を約束しているか**を書きます。仕様書だけを読んで同じ画面を組み直せることを目標に
します。

## 2 つに分ける

画面ごとに、機能要件と画面要件を別のファイルに分けます。混ざっていると、契約から決まることと
デザインの判断が区別できず、片方だけを差し替えられません。

振り分けはこの問いで決めます。

> **バックエンドの契約と利用者の目的が同じまま、その記述だけが違う画面があり得るか。**
> あり得る → 画面要件。あり得ない → 機能要件。

| | 機能要件（`*.function.md`） | 画面要件（`*.screen.md`） |
| --- | --- | --- |
| 主語 | 何ができるか | どう見えるか |
| 例 | 値は差分ではなく結果で送る / 対象が 1 つ以上なければ次の段へ進めない / 取得の失敗は画面全体に及ぶ | 上限に達したら値を増やす操作を押せなくする / `lg` 未満では集計を画面の下から出す / 失敗はその操作の隣に出す |

## 置き場所

**`src/app` の階層をそのまま写します。** ルートごとにディレクトリを作り、その中に対応する
ファイルの仕様を置きます。置き場を考える必要がなく、layout の約束にも置き場ができます。

| 実装 | 仕様書 |
| --- | --- |
| `layout.tsx`（根） | `route/layout.{screen,function}.md` |
| `page.tsx`（根） | `route/page.{screen,function}.md` |
| `<segment>/page.tsx` | `route/<segment>/page.{screen,function}.md` |
| `(group)/layout.tsx` | `route/<group>/layout.{screen,function}.md` |
| `(group)/<segment>/page.tsx` | `route/<group>/<segment>/page.{screen,function}.md` |
| `(group)/<segment>/<child>/page.tsx` | `route/<group>/<segment>/<child>/page.{screen,function}.md` |
| `(group)/<segment>/[id]/page.tsx` | `route/<group>/<segment>/[id]/page.{screen,function}.md` |

route group は URL に現れないため、括弧を外した名前で置きます（`(group)` → `<group>/`）。動的
セグメントは URL に現れるため、角括弧を含む名前のまま置きます。

**並行ルートのスロット（`@slot/`）は置き場を持ちません。**URL に現れず、独立した画面でもないため、
その約束はスロットを差し込む画面の仕様書が持ちます（`<group>/@slot/<segment>/page.tsx` の約束は
`route/<group>/<segment>/page.screen.md`）。

**開発専用の route も仕様書を持ちます。**`page.dev.tsx` は build から外れますが
（[0113](../adr/0113-development-access-surface.ja.md)）、**build から外れることと、約束を持たないことは
別**です。置き場の写し方は他と同じです。

**layout の仕様はその配下すべてに効きます。** 画面をまたぐ約束（外枠が供給する状態、認証の扱い、
レンダリングの時点への影響）は上位の `layout.*.md` に 1 回だけ書き、各画面はそこからの差分を書きます。

**機能要件を持たない画面には `page.function.md` を置きません。** 空のファイルは「まだ書いて
いない」と「無い」の区別を消します。

## いま書いてある画面

| ルート | 仕様書 |
| --- | --- |
| 根の外枠 | [`layout.screen.md`](route/layout.screen.ja.md) / [`layout.function.md`](route/layout.function.ja.md) |
| `(shop)` 外枠 | [`layout.screen.md`](route/shop/layout.screen.ja.md) / [`layout.function.md`](route/shop/layout.function.ja.md) <!-- sample:line --> |
| `/` | [`screen`](route/shop/page.screen.ja.md) / [`function`](route/shop/page.function.ja.md) <!-- sample:line --> |
| `/products` | [`screen`](route/shop/products/page.screen.ja.md) / [`function`](route/shop/products/page.function.ja.md) <!-- sample:line --> |
| `/products/[id]` | [`screen`](<route/shop/products/[id]/page.screen.ja.md>) / [`function`](<route/shop/products/[id]/page.function.ja.md>) <!-- sample:line --> |
| `/cart` | [`screen`](route/shop/cart/page.screen.ja.md) / [`function`](route/shop/cart/page.function.ja.md) <!-- sample:line --> |
| `/checkout` | [`screen`](route/shop/checkout/page.screen.ja.md) / [`function`](route/shop/checkout/page.function.ja.md) <!-- sample:line --> |
| `/checkout/complete` | [`screen`](route/shop/checkout/complete/page.screen.ja.md) / [`function`](route/shop/checkout/complete/page.function.ja.md) <!-- sample:line --> |
| `/purchases` | [`screen`](route/shop/purchases/page.screen.ja.md) / [`function`](route/shop/purchases/page.function.ja.md) <!-- sample:line --> |
| `/purchases/[code]` | [`screen`](<route/shop/purchases/[code]/page.screen.ja.md>) / [`function`](<route/shop/purchases/[code]/page.function.ja.md>) <!-- sample:line --> |
| `/mypage` | [`screen`](route/shop/mypage/page.screen.ja.md) / [`function`](route/shop/mypage/page.function.ja.md) <!-- sample:line --> |
| `/mypage/edit` | [`screen`](route/shop/mypage/edit/page.screen.ja.md) / [`function`](route/shop/mypage/edit/page.function.ja.md) <!-- sample:line --> |
| `/mypage/inquiry` | [`screen`](route/shop/mypage/inquiry/page.screen.ja.md) / [`function`](route/shop/mypage/inquiry/page.function.ja.md) <!-- sample:line --> |
| `(site-info)` 外枠 | [`layout.screen.md`](route/site-info/layout.screen.ja.md) / [`layout.function.md`](route/site-info/layout.function.ja.md) <!-- sample:line --> |
| `/about` | [`screen`](route/site-info/about/page.screen.ja.md) / [`function`](route/site-info/about/page.function.ja.md) <!-- sample:line --> |
| `/privacy` | [`screen`](route/site-info/privacy/page.screen.ja.md) / [`function`](route/site-info/privacy/page.function.ja.md) <!-- sample:line --> |
| `/terms` | [`screen`](route/site-info/terms/page.screen.ja.md) / [`function`](route/site-info/terms/page.function.ja.md) <!-- sample:line --> |
| `admin` 外枠 | [`screen`](route/admin/layout.screen.ja.md) / [`function`](route/admin/layout.function.ja.md) <!-- sample:line --> |
| `/admin` | [`screen`](route/admin/page.screen.ja.md) / [`function`](route/admin/page.function.ja.md) <!-- sample:line --> |
| `/admin/analytics` | [`screen`](route/admin/analytics/page.screen.ja.md) / [`function`](route/admin/analytics/page.function.ja.md) <!-- sample:line --> |
| `/admin/products` | [`screen`](route/admin/products/page.screen.ja.md) / [`function`](route/admin/products/page.function.ja.md) <!-- sample:line --> |
| `/admin/products/new` | [`screen`](route/admin/products/new/page.screen.ja.md) / [`function`](route/admin/products/new/page.function.ja.md) <!-- sample:line --> |
| `/admin/products/[id]/edit` | [`screen`](<route/admin/products/[id]/edit/page.screen.ja.md>) / [`function`](<route/admin/products/[id]/edit/page.function.ja.md>) <!-- sample:line --> |
| `/admin/products/[id]/stock` | [`screen`](<route/admin/products/[id]/stock/page.screen.ja.md>) / [`function`](<route/admin/products/[id]/stock/page.function.ja.md>) <!-- sample:line --> |
| `/admin/inquiries` | [`screen`](route/admin/inquiries/page.screen.ja.md) / [`function`](route/admin/inquiries/page.function.ja.md) <!-- sample:line --> |
| `/admin/inquiries/[inquiryId]` | [`screen`](<route/admin/inquiries/[inquiryId]/page.screen.ja.md>) / [`function`](<route/admin/inquiries/[inquiryId]/page.function.ja.md>) <!-- sample:line --> |
| `/admin/shipments` | [`screen`](route/admin/shipments/page.screen.ja.md) / [`function`](route/admin/shipments/page.function.ja.md) <!-- sample:line --> |
| `/admin/users` | [`screen`](route/admin/users/page.screen.ja.md) / [`function`](route/admin/users/page.function.ja.md) <!-- sample:line --> |
| `auth` 外枠 | [`screen`](route/auth/layout.screen.ja.md) |
| `/login` | [`screen`](route/auth/login/page.screen.ja.md) / [`function`](route/auth/login/page.function.ja.md) |
| `/onboarding` | [`screen`](route/auth/onboarding/page.screen.ja.md) / [`function`](route/auth/onboarding/page.function.ja.md) <!-- sample:line --> |
| `/dev/session` | [`screen`](route/dev/session/page.screen.ja.md) / [`function`](route/dev/session/page.function.ja.md) |
| `/maintenance` | [`screen`](route/maintenance/page.screen.ja.md) / [`function`](route/maintenance/page.function.ja.md) |
<!-- sample:replace-begin -->
<!-- sample:replace-with -->
<!-- = | `/` | `route/page.screen.md` |-->
<!-- sample:replace-end -->

**このインベントリが画面の一覧です。** 画面の約束はここが持ち、ほかの文書が代わりに持つことはありません
（[0143](../adr/0143-spec-driven-development.ja.md)）。

**仕様書を先に固めることは求めません。** 書ける時点は見た目が確定した後なので、画面実装の順序
（[`playbook.md`](../playbook.ja.md)）では story のレビューを通ったあとに置きます。ただし
**仕様書を持たない route が残るのは埋めるべき穴であって、正常な状態ではありません。**
`src/app` の route とこのインベントリは機械で突き合わせます（[`scripts/spec-routes.gate.test.ts`](../../scripts/spec-routes.gate.test.ts)）。

## セクションの語彙

**同じ主題のセクションは、どの画面でも同じ見出しで書きます。** 見出しが揃っていれば、2 つの画面の同じ
約束を並べて読めて、片方にだけ欠けているセクションがそのまま目に入ります。下の語彙に当たらない主題は、
その画面に固有の見出しを立てます。語彙の側を画面ごとに言い換えません。

| 見出し | 置く側 | 書くこと |
| --- | --- | --- |
| `見せるもの` | 画面要件 | 何をどの順で見せるか。画面の骨格 |
| `待機` / `空の状態` / `失敗の見え方` | 画面要件 | 状態ごとの見え方。どこに何が出て、何が残るか |
| `幅による組み替え` | 画面要件 | バンド（`lg` 以上 / 未満など）で骨格がどう変わるか |
| `パンくず` | 画面要件 | 階層の見せ方と、どこへ戻れるか |
| `カタログでの確認` | 画面要件 | Storybook で確かめるときの前提。story の中で差し替えている応答など |
| `主体と所有` | 機能要件 | 誰の何を扱い、どの判断をバックエンドが持つか |
| `取得` | 機能要件 | 何を何系統取得し、取得のたびに何が変わりうるか |
| `失敗` | 機能要件 | 失敗ごとに、及ぶ範囲と受ける境界 |
| `認可` | 機能要件 | 誰が入れて、入れないときにどこへ送るか |
| `送信` | 機能要件 | 何を送り、成立したら何が起きるか |
| `関連` | 両方 | 実装の README、上位の layout の仕様書、進む先と戻る先。**最後のセクションに置きます** |

## 何を書かないか

仕様書は次の 5 つを**指すだけ**で、コピーしません。コピーした時点で、直したときに 2 か所へ反映すること
になります。

| 指す先 | そこが持つもの |
| --- | --- |
| `openapi/<name>.gen.yaml`（[`openapi/README.md`](../../openapi/README.md)） | 契約（型・エラー・上限値） |
| `tokens/primitives.json` | 値（段の幅など） |
| [`rules.md`](../rules.ja.md) | 日常的に強制される規約 |
| `components/**/README.md` + Storybook | コンポーネントの語彙 |
| [`adr/`](../adr/) | 機構の選択と、その理由 |
| [`glossary.md`](glossary.ja.md) | 仕様書の散文が使う、**契約に無い画面の側の語** |

したがって、仕様書には次を書きません。

- **コンポーネントの名前**。「集計と先へ進む導線を 1 つの器にまとめる」までを書き、どのコンポーネントを使うかは
  書きません。コンポーネント名を書くと、再生成はできても改名のたびに腐ります
- **単位つきの数値**。段は `lg` 以上 / `lg` 未満のように名前で書きます
- **レイヤーをまたぐ規約**。「サイドバーは `lg` 以上でのみ出す」は規約であって、個別の画面の仕様では
  ありません
- **実装の手順**。コードが持ちます
- **画面に固有でない運用**。feature の README が持ちます
