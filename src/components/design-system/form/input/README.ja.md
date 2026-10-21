> **このファイルは [`README.md`](README.md) の日本語訳です。**
> 直接編集しないでください。変更は英語の canonical な `README.md` を先に更新し、そのうえでこの日本語訳を同期してください。
> エージェントが読むのは `README.md` だけです。このファイルは人間が読むための翻訳です。

# Input

## 用途

単一行の native `input` を表示・送信します。

## 役割と公開 component

| Component | 役割 |
| --- | --- |
| `Input` | native `input` の属性・form 送信を保ったまま見た目を統一する、SSR first の単一行入力です。 |

## 利用ケース

`name`、`type`、`autoComplete`、`required` を使う通常の form 入力に使います。

## 責務境界

項目名は `Label`、説明・検証エラーは `Field` または feature が構成します。`aria-invalid` と `aria-describedby` の関連付けも呼び出し側が行います。

## Storybook とテスト

Storybook は label・email・password・file・disabled・invalid を、テストは native 属性と a11y を確認します。
