# AlertDialog

## 用途

削除など不可逆な操作を実行前に確認します。

## 役割と公開 component

| Component | 役割 |
| --- | --- |
| `AlertDialog` | 確認 dialog の開閉状態を提供する client-side root です。 |
| `AlertDialogTrigger` | dialog を開く操作を包む trigger です。`Button` を使う場合は `asChild` で合成します。 |
| `AlertDialogContent` | Portal と overlay とともに dialog 本体を描画します。 |
| `AlertDialogOverlay` | dialog の背面を覆います。`AlertDialogContent` が内部で使います。 |
| `AlertDialogPortal` | 描画先の Portal です。`AlertDialogContent` が内部で使います。 |
| `AlertDialogHeader` | title と説明をまとめる領域です。 |
| `AlertDialogTitle` | dialog のアクセシブルな名前になる title です。 |
| `AlertDialogDescription` | 操作の影響と次に取る行動を説明する本文です。 |
| `AlertDialogFooter` | cancel と action を並べる操作領域です。 |
| `AlertDialogAction` | 確認済みの操作を完了して dialog を閉じます。`Button` 合成で、`variant` / `size` を受け取ります。 |
| `AlertDialogCancel` | 操作を取り消して dialog を閉じます。既定は `outline` の `Button` 合成です。 |

## 利用ケース

取り消せない操作の直前に、何が起きるかを読ませてから実行させる場面に使います。削除、退会、公開の取り下げなどが該当します。

補助的な詳細表示や通常の編集には使いません。それらは [`Dialog`](../dialog/README.md) の担当です。`AlertDialog` は確認のための専用の形であり、確認を要さない内容に使うと操作の妨げになります。

破壊的な操作であることは配色だけでなく文言で示します。`AlertDialogAction` の既定は通常の `Button` なので、破壊的に見せる場合は呼び出し元が [`Button`](../../action/button/README.md) の `destructive` variant を指定します。

## 責務境界

Client island として開閉・focus trap・Escape を担い、確認内容・Server Action・実行結果は feature が children として渡します。

何を消すのか、実行後にどこへ遷移するのか、失敗したときに何を出すのかは持ちません。`AlertDialogAction` は dialog を閉じるところまでで、実行そのものは呼び出し元の handler または `form` の送信が担います。

`AlertDialogTitle` と `AlertDialogDescription` は Radix が dialog のアクセシブルな名前と説明として関連付けます。title を省くと dialog が名前を持たなくなるため、必ず置きます。

vendor は現在 Radix ですが、公開 API に vendor 名は含めません。

## Storybook とテスト

Storybook は破壊的操作の確認という基本構成（`Default`）を確認します。テストは trigger からの開閉、`alertdialog` role と title によるアクセシブルな名前、`AlertDialogCancel` で閉じること、a11y 自動検査を確認します。
