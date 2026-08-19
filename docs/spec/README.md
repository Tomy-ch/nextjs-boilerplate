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
| 例 | 数量は加算ではなく設定で送る / 買える明細が 1 つ以上なければ購入手続きへ進めない / 取得の失敗は画面全体に及ぶ | 上限に達したら増やす操作を押せなくする / `lg` 未満では集計を画面の下から出す / 失敗はその操作の隣に出す |

## 置き場所

**`src/app` の階層をそのまま写します。** ルートごとにディレクトリを作り、その中に対応する
ファイルの仕様を置きます。置き場を考える必要がなく、layout の約束にも置き場ができます。

| 実装 | 仕様書 |
| --- | --- |
| `(shop)/layout.tsx` | `route/shop/layout.{screen,function}.md` |
| `(shop)/cart/page.tsx` | `route/shop/cart/page.{screen,function}.md` |
| `(shop)/mypage/edit/page.tsx` | `route/shop/mypage/edit/page.{screen,function}.md` |
| `(shop)/products/[id]/page.tsx` | `route/shop/products/[id]/page.{screen,function}.md` |

route group は URL に現れないため、括弧を外した名前で置きます（`(shop)` → `shop/`）。動的
セグメントは URL に現れるため、角括弧を含む名前のまま置きます。

**layout の仕様はその配下すべてに効きます。** 画面をまたぐ約束（外枠に出るカート、認証の扱い）は
上位の `layout.*.md` に 1 回だけ書き、各画面はそこからの差分を書きます。

**機能要件を持たない画面には `page.function.md` を置きません。** 空のファイルは「まだ書いて
いない」と「無い」の区別を消します。

## いま書いてある画面

| ルート | 仕様書 |
| --- | --- |
| `(shop)` 外枠 | [`layout.screen.md`](route/shop/layout.screen.md) / [`layout.function.md`](route/shop/layout.function.md) |
| `/products` | [`screen`](route/shop/products/page.screen.md) / [`function`](route/shop/products/page.function.md) |
| `/products/[id]` | [`screen`](<route/shop/products/[id]/page.screen.md>) / [`function`](<route/shop/products/[id]/page.function.md>) |
| `/cart` | [`screen`](route/shop/cart/page.screen.md) / [`function`](route/shop/cart/page.function.md) |
| `/checkout` | [`screen`](route/shop/checkout/page.screen.md) / [`function`](route/shop/checkout/page.function.md) |
| `/checkout/complete` | [`screen`](route/shop/checkout/complete/page.screen.md) / [`function`](route/shop/checkout/complete/page.function.md) |
| `/purchases` | [`screen`](route/shop/purchases/page.screen.md) / [`function`](route/shop/purchases/page.function.md) |
| `/purchases/[id]` | [`screen`](<route/shop/purchases/[id]/page.screen.md>) / [`function`](<route/shop/purchases/[id]/page.function.md>) |
| `/mypage` | [`screen`](route/shop/mypage/page.screen.md) / [`function`](route/shop/mypage/page.function.md) |
| `/mypage/edit` | [`screen`](route/shop/mypage/edit/page.screen.md) / [`function`](route/shop/mypage/edit/page.function.md) |
| `/about` | [`screen`](route/shop/about/page.screen.md) / [`function`](route/shop/about/page.function.md) |
| `/privacy` | [`screen`](route/shop/privacy/page.screen.md) / [`function`](route/shop/privacy/page.function.md) |
| `/terms` | [`screen`](route/shop/terms/page.screen.md) / [`function`](route/shop/terms/page.function.md) |
| `/dev/session` | [`screen`](route/dev/session/page.screen.md) / [`function`](route/dev/session/page.function.md) |

**この目録は「書いた画面の一覧」であって、画面の一覧ではありません。**実装済みの画面は
[`screens.md`](../screens.md) が持ちます。

## 何を書かないか

仕様書は次の 5 つを**指すだけ**で、写しません。写した時点で、直したときに 2 か所へ反映すること
になります。

| 指す先 | そこが持つもの |
| --- | --- |
| `openapi/api.gen.yaml` | 契約（型・エラー・上限値） |
| `tokens/primitives.json` | 値（段の幅など） |
| [`rules.md`](../rules.md) | 日常的に強制される規約 |
| `components/**/README.md` + Storybook | 部品の語彙 |
| [`adr/`](../adr/) | 機構の選択と、その理由 |

したがって、仕様書には次を書きません。

- **部品の名前**。「小計と先へ進む導線を 1 つの器にまとめる」までを書き、どの部品を使うかは
  書きません。部品名を書くと、再生成はできても改名のたびに腐ります
- **単位つきの数値**。段は `lg` 以上 / `lg` 未満のように名前で書きます
- **層をまたぐ規約**。「脇の領域は `lg` 以上でのみ出す」は規約であって、個別の画面の仕様では
  ありません
- **実装の手順**。コードが持ちます
- **画面に固有でない運用**。feature の README が持ちます
