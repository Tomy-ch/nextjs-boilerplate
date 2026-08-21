# Button

## 用途

利用者の操作を開始します。

## 役割と公開 component

| Component | 役割 |
| --- | --- |
| `Button` | 操作を開始する button。`variant`、`size`、`disabled`、`pending` を提供し、`asChild` で link などの操作要素にも同じ見た目を適用できます。 |

## 利用ケース

form の送信、画面内の操作、再試行に使います。遷移には `asChild` と単一の link 要素を組み合わせ、アプリ内の遷移には `next/link` の `Link`、外部 URL には native の `a` を使います。

取り消せない操作には `destructive` を使います。配色だけでは何が起きるかを伝えられないため、文言でも示します（[`AlertDialog`](../../overlay/alert-dialog/README.md)）。

## 送信中の見せ方

`pending` を渡すと、**文言をその場所に残したまま**回転する印を重ね、押せなくします。

文言を「送信しています…」のように差し替えたり、印を文言の隣へ足したりすると器の幅が動きます。脇に貼り付いた集計や下端に固定した帯では、周りの位置まで動きます。重ねればその揺れが起きません。

見えなくなった文言は支援技術からも外れるため、待っていることは `pendingLabel` が伝えます。省略すると見た目でしか伝わりません。

`asChild` とは併せられません。合成先の要素の中身をこの component が組み替えられないためです。

## 責務境界

業務上の可否、送信中、結果通知は feature が管理します。form 送信時の native `type` も呼び出し側が明示します。

## Storybook とテスト

Storybook は variant（`destructive` を含む）・size・disabled・pending・link を、テストは基本表示と `asChild` を確認します。
