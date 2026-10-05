> **このファイルは [`page.function.md`](page.function.md) の日本語訳です。**
> 直接編集しないでください。変更は英語の canonical な `page.function.md` を先に更新し、そのうえでこの日本語訳を同期してください。
> エージェントが読むのは `page.function.md` だけです。このファイルは人間が読むための翻訳です。

# `/about` このサイトについて（機能要件）

> 画面要件は [`page.screen.md`](page.screen.ja.md)。

## レンダリング

**build 時に固める。** 取得を持たず、内容が変わるのはコードを書き換えたときだけである
（[0041](../../../../adr/0041-cache-components-decision.ja.md)）。レイアウトシェルも何も読まない
（[`../layout.function.md`](../layout.function.ja.md)）。

## 認可

**保護の対象にしない。** 何のためのサイトかは、ログインする前に読めなければ意味を持たない。
