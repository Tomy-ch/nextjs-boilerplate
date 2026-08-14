# 画面仕様

実装された画面の仕様を、**ルートと同じ階層**で置きます。`/mypage/edit` の仕様は
[`shop/mypage/edit.md`](shop/mypage/edit.md) にあり、画面を探すのに目録を読む必要がありません。

## 何を書くか

書くのは**その画面が何を約束しているか**です。

- 何を見せ、何を操作できるか
- どこからデータを取り、取れなかったときどうなるか
- 認証・認可の扱い
- 幅による組み替え
- その画面でだけ効く判断と、その理由

## 何を書かないか

- **部品の使い方**。`components` の各 README が持ちます
- **層をまたぐ規約**。ADR が持ちます。仕様書からは参照するだけです
- **実装の手順**。コードが持ちます。ここに書くと、直したときに 2 か所へ反映することになります
- **画面に固有でない運用**。feature の README が持ちます

## 置き場所

`app` の route group は階層に含めません。`(shop)` は URL に現れないため、`docs/spec/shop/` の
ように括弧を外した名前で置きます。ファイル名は route segment と同じにします。

| ルート | 仕様書 |
| --- | --- |
| `/mypage` | [`shop/mypage/index.md`](shop/mypage/index.md) |
| `/mypage/edit` | [`shop/mypage/edit.md`](shop/mypage/edit.md) |
| `/about` | [`shop/about.md`](shop/about.md) |
| `/privacy` | [`shop/privacy.md`](shop/privacy.md) |
| `/terms` | [`shop/terms.md`](shop/terms.md) |

まだ仕様書を持たない画面があります。**この目録は「書いた画面の一覧」であって、画面の一覧では
ありません。**実装済みの画面は [`screens.md`](../screens.md) が持ちます。
