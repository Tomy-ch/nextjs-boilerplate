# AuthStateFeedback

## 用途

サインインしていない・権限が足りない・見つからない、という状態と、そこから抜け出すための導線を表示します。

## 役割と公開 component

| Component | 役割 |
| --- | --- |
| `AuthStateFeedback` | 状態に応じた見出し・説明・icon を表示する SSR first component です。 |
| `AuthSignInAction` | サインインを開始する Route Handler へ document 遷移する導線です。 |
| `AUTH_STATE` / `AUTH_STATE_MESSAGE` | 扱う状態と、その既定の文言です。overlay で表示する場合は文言だけを使えます。 |

## 扱う状態

| 状態 | HTTP | 次に取る行動 |
| --- | --- | --- |
| `unauthenticated` | 401 | サインインする |
| `session-expired` | 401 | サインインし直す |
| `forbidden` | 403 | アプリ内の戻り先へ戻る、管理者へ依頼する |
| `not-found` | 404 | アプリ内の戻り先へ戻る |

`unauthenticated` と `session-expired` は同じ 401 ですが、一度サインインしていた人には「入力中の内容が失われる」ことを伝える必要があるため、文言を分けています。

404 をここで扱うのは、権限の無い資源の存在を伏せるために 403 ではなく 404 を返す運用があるためです。利用者から見た次の行動は 403 と同じになります。

## `ApiErrorAlert` との使い分け

401 / 403 / 404 は、同じ操作を再試行しても結果が変わりません。[`api-error-feedback`](../api-error-feedback/README.md) が提供する再試行導線はこれらの状態では誤りなので、別の部品にしています。通信や処理そのものの失敗は `ApiErrorAlert` が、利用者が別の行動を取る必要がある状態はこの部品が扱います。

## サインインの導線

`AuthSignInAction` は `next/link` ではなく `a` を描画します。サインインの開始は Route Handler（`/api/auth/*`）から IdP への redirect であり、client 側の遷移では処理できないためです。

`href` の組み立てと `returnUrl` の検証は呼び出し元が持ちます。復帰先を外部 URL にできないよう同一 origin の相対パスに限定するのは feature / adapter の責務で、この部品は受け取った URL をそのまま使います。

## 責務境界

session の検証、権限の判定、status code の分類は持ちません。`adapters/server` が正規化した結果を feature が状態へ対応させて渡します。

見出しと説明は差し替えられます。何の権限が足りないかを具体的に言える場合は、既定の文言より具体的に書きます。

操作を止めて伝える必要がある場合は、呼び出し元が `AlertDialog` を組み立て、`AUTH_STATE_MESSAGE` の文言と `AuthSignInAction` を中へ置きます。この部品は `role="alert"` を持つため、`role="alertdialog"` の中へ入れ子にしません。

## Storybook とテスト

Storybook は 4 つの状態、文言の差し替え、overlay として組み立てた場合を確認します。テストは状態ごとの既定文言、権限不足だけを注意として示すこと、`data-state` を持つこと、文言と導線の差し替え、サインインの導線が client 遷移しないこと、a11y 自動検査を確認します。
