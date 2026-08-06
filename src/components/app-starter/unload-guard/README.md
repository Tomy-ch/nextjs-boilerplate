# UnloadGuard

## 用途

未保存のまま画面を離れようとしたときに、browser 標準の確認を出します。

## 役割と公開 component

| Component | 役割 |
| --- | --- |
| `UnloadGuard` | `beforeunload` を登録する client island です。何も描画しません。 |

## 利用ケース

編集途中の form がある画面に置き、未保存のあいだ `when` を `true` にします。

## 抑止できる経路

| 経路 | 抑止 |
| --- | --- |
| リロード | ✅ |
| タブ / window を閉じる | ✅ |
| 外部サイトへの遷移 | ✅ |
| アプリ内の `Link` 遷移 | ❌ [`NavigationGuard`](../navigation-guard/README.md) が扱う |
| browser の戻る / 進む | ❌ どちらでも塞げない |

App Router は client 側の遷移を止める API を持たないため、`Link` による遷移では `beforeunload` が発火しません。戻る / 進むは history の操作であり、`beforeunload` の対象外です。

## 責務境界

未保存かどうかの判定、保存処理、フォームの値は持ちません。呼び出し元が `when` として渡します。

確認の文言と見た目は browser が持ち、変更できません。仕様上 `beforeunload` のメッセージは無視されるため、この部品は文言を受け取りません。「何が失われるか」を伝えるのは画面側の役割で、未保存であることは form の近くに表示します。

## Storybook とテスト

Storybook は未保存になると確認が登録される編集 form と、`when` が false の状態を確認します。テストは何も描画しないこと、`when` の真偽で離脱の確認が切り替わること、`when` が false へ変わったときと unmount 時に確認を解除することを確認します。

`beforeunload` は browser が確認 dialog を出すため、Storybook 上で挙動を見るにはリロードやタブを閉じる操作が要ります。テストでは `beforeunload` を dispatch し、`defaultPrevented` で登録の有無を判定します。
