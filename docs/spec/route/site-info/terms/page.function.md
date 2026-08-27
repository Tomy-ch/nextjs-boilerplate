# `/terms` 利用規約（機能要件）

> 画面要件は [`page.screen.md`](page.screen.md)。

## レンダリング

**build 時に固める。** 取得を持たず、内容が変わるのはコードを書き換えたときだけである
（[0040](../../../../adr/0040-routing-rendering-strategy.md)）。器も何も読まない
（[`../layout.function.md`](../layout.function.md)）。

## 認可

**保護の対象にしない。** 閲覧した時点で同意とみなす以上、ログインする前に読めなければ成立
しない。
