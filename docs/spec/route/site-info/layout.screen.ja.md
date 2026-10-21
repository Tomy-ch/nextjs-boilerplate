> **このファイルは [`layout.screen.md`](layout.screen.md) の日本語訳です。**
> 直接編集しないでください。変更は英語の canonical な `layout.screen.md` を先に更新し、そのうえでこの日本語訳を同期してください。
> エージェントが読むのは `layout.screen.md` だけです。このファイルは人間が読むための翻訳です。

# `(site-info)` 外枠（画面要件）

> 機能要件は [`layout.function.md`](layout.function.ja.md)。

サイトの案内を包むレイアウトシェル。header・本文・footer で構成する。

## header

| 区画 | 内容 |
| --- | --- |
| サイト名 | トップへの導線 |
| nav | 商品 / 購入履歴 / マイページ |

**利用者向けの外枠と同じ見え方にする。** レイアウトシェルが分かれているのはレンダリングする時点の都合であり、利用者には
同じサイトの続きとして見える必要がある。

**カートの入口だけが無い。** 理由は [`layout.function.md`](layout.function.ja.md) が持つ。

## 本文の脇

置かない。脇に出すものがこのレイアウトシェルには無い。

## footer

このリポジトリが何であるかの 1 文と、リポジトリへの導線を置く（`(shop)` と同じ）。

## パンくず

置かない。配下はいずれも階層を持たない 1 枚である。

## 関連

- 実装 `src/app/(site-info)/layout.tsx` / `src/features/site-info/` — [README](../../../../src/features/site-info/README.ja.md)
