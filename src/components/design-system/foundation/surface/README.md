# Surface

## 用途

design token の**系統**（`user` / `admin`）を部分木へ効かせるための基盤です。切替の機構そのものは
token 側（`tokens/themes/<系統>/<配色>.json` と生成物）が持ち、ここが持つのは**属性をどこに置くか**
だけです。

> 綴りは `surface` ですが、呼び名は「系統」です。「面」は `bg-*` が塗る面を指す語として repo 全体で
> 使うためで、根拠は [`tokens/README.md`](../../../../../tokens/README.md)「切替の軸は 2 本」。

## 役割と公開 component

| Component / 型 | 役割 |
| --- | --- |
| `SurfacePortalBridge` | 部分木の系統を Portal の出口（`body`）へ載せる client island です。描くものを持ちません。 |
| `SURFACE` | 既定以外の系統の名前です。既定（`user`）は属性を持たないため含みません。 |
| `SURFACE_ATTRIBUTE` | 系統を載せる属性の名前です。 |

## 利用ケース

- 管理側のように、利用者向けとは違う配色・書体で描く画面の器を作る場合

## 責務境界

**token の値を持ちません。** どの系統がどの色・書体・発光を持つかは `tokens/themes/` が SSOT で、
部品側は `--semantic-color-*` を引き直すだけです。**配下の部品に改修は要りません。**

**属性を自分では置きません。** 部分木の外枠へ `data-surface` を置くのは器（`AdminShell` など）の
仕事です。この基盤が引き受けるのは、その属性が**届かない場所**への橋渡しだけです。

### なぜ橋が要るのか

`Dialog` / `Popover` / `DropdownMenu` / `Sheet` / `Tooltip` / `ContextMenu` は Radix の Portal で
**`document.body` 直下へ出ます**。器の外枠に属性を置いても、overlay の中身はその外へ落ちるため、
系統を切り替えても既定のまま描かれます（`tokens/README.md`「属性を置く場所は、Portal を含む位置で
なければならない」）。

token 側は「`body` 相当に置く」か「Portal の `container` を系統の内側へ向ける」の 2 択を示し、
どちらを採るかを画面へ委ねています。このリポジトリは**前者**を、次の分担で採っています。

| 描かれるもの | 系統を与える経路 | いつ効くか |
| --- | --- | --- |
| 本文 | 器が外枠へ置く `data-surface` | server が描いた時点。切り替わりが画面に現れない |
| overlay の中身 | `SurfacePortalBridge` が `body` へ載せる | hydration の後 |

**後者が hydration の後でも足りるのは、overlay が操作で開くものだからです。** 開けるのは hydration
より後なので、中身が既定の系統で描かれる瞬間が存在しません。`container` を差し替える案を採らな
かったのは、overlay 部品 6 つに口を足したうえで、呼び出し側が毎回指定することになるためです。

**外れるときに属性を消します。** 系統を持つ部分木から出ても `body` に残ると、次に開いた overlay が
前の画面の系統で描かれます。

## Storybook とテスト

Storybook は系統ごとの見え方を `Tokens/*` のカタログが持ちます。この基盤は描くものを持たないため、
単独の story を置きません。切替は preview の globals（`surface`）から行い、そちらも同じ `body` へ
属性を置きます。

テストは、出口へ系統が載ること・外れると消えること・描くものを持たないことを確認します。
