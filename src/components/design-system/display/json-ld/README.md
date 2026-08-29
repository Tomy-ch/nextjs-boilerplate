# JsonLd

## 用途

画面が持つ構造化データ（schema.org / JSON-LD）を `<script type="application/ld+json">` として埋め込みます。

## 役割と公開 component

| Component | 役割 |
| --- | --- |
| `JsonLd` | 受け取った object を JSON-LD の script として置く。`<` を逃がし、値の中身で script が閉じないようにする |

## 利用ケース

検索エンジンに画面の意味（組織・記事・イベントなど）を伝えたい画面が、schema.org の語彙で組み立てた object を渡します。何を伝えるかは画面の判断で、object を組み立てる関数は feature 側に置きます（[ADR 0044](../../../../../docs/adr/0044-seo-metadata-strategy.md) §4）。

`<head>` ではなく本文の中に置いて構いません。JSON-LD は文書のどこにあっても読まれます。読み手が人ではなく検索エンジンであるだけで、受け取った内容を読める形にして見せる `display` の部品です。

## 責務境界

**持つのは直列化と逃がしだけ**です。schema.org の type も項目も検証しません。組み立てた object が語彙として正しいかは、組み立てる側のテストが見ます。

`<` を `\u003c` へ逃がすのは、値の出所がバックエンドである以上、文字列の中に `</script>` が入らないことを前提にできないためです。JSON としての値は変わりません。

Server Component として使えます。hydration は不要です。

## Storybook とテスト

Storybook は見える要素を持たない component であることを示します。テストは script が置かれ JSON として読めること、見える要素を持たないこと、script を閉じる文字が逃がされ JSON の値は変わらないことを確認します。
