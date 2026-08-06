# NavigationGuard

## 用途

未保存のままアプリ内を移動しようとしたときに、確認してから遷移します。

## 役割と公開 component

| Component | 役割 |
| --- | --- |
| `NavigationGuard` | 配下の link click を傍受し、`AlertDialog` で確認する client island です。 |

## 利用ケース

編集途中の form を含む画面を包み、未保存のあいだ `when` を `true` にします。`children` が監視の範囲になるので、確認したい link を含む領域を渡します。

## 抑止できる経路

| 経路 | 抑止 |
| --- | --- |
| 配下の link によるアプリ内遷移 | ✅ |
| リロード / タブを閉じる / 外部サイトへの遷移 | ❌ [`UnloadGuard`](../unload-guard/README.md) が扱う |
| browser の戻る / 進む | ❌ **どちらでも塞げない** |

戻る / 進むを塞げないのは、App Router が client 側の遷移を止める API を持たず、`popstate` は遷移が起きたあとにしか発火しないためです。塞ぐには履歴を差し戻すしかなく、利用者の操作を覆すことになるので採りません。

両方を塞ぐ画面では `UnloadGuard` と併用します。責務が別なので 1 つの部品にまとめていません。

## 対象にしない link

次のものは遷移を止めません。いずれも「この画面を離れる意図が明示されている」か「遷移が起きない」ためです。

- 別 origin への link、`target` 指定、`download` 指定
- 現在地と同じ URL
- 修飾キーつきの click、中クリック（別タブで開く操作であり、この画面は離れない）
- 外側で既に `preventDefault` された click

## 責務境界

未保存かどうかの判定、保存処理、遷移先の決定は持ちません。呼び出し元が `when` と link を渡します。確認の文言は差し替えられますが、既定でも意味が通る文言を持ちます。

click の経路は `composedPath()` から辿ります。捕捉段階（`onClickCapture`）で受け取るため、link 自身の `onClick` より先に判定します。

確認を閉じたときは、押した link へ focus を戻します。keyboard だけで操作している人が、留まったあと同じ位置から続けられるようにするためです。

## Storybook とテスト

Storybook は未保存の状態で link を押した場合、文言の差し替え、対象にしない link の一覧、`UnloadGuard` との併用を確認します。テストは遷移を止めて確認すること、続行時に router へ遷移を渡すこと、留まると遷移しないこと、`when` が false なら傍受しないこと、対象にしない link と click（download / target / 外部 / 修飾キー / 中クリック / 現在地 / 外側で止め済み / link 以外）、文言の差し替えを確認します。

`useRouter` はテストで差し替えます。遷移そのものは Next.js の責務なので、この部品は「どの href を渡したか」までを確認します。
