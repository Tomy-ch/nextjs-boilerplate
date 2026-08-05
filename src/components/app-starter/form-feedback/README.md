# FormFeedback

## 用途

Server Action や native form の結果を、利用者が理解できる要約と次の行動として表示します。

## 役割と公開 component

| Component | 役割 |
| --- | --- |
| `FormFeedback` | `Alert` を使い、title・description・任意の request ID・次の行動を表示します。 |

## 利用ケース

保存失敗、再試行依頼、処理完了後の補足など、form 全体に関わる結果を表示する場合に使います。

## 責務境界

Server Component であり、Server Action の呼び出し、エラー分類、文言変換、field 単位の検証は持ちません。feature が意味のある props へ変換して渡します。field 単位のエラーには `FieldError` を使います。

## Storybook とテスト

Storybook は通常、request ID、次の行動を、test は意味論・リンク・a11y を確認します。
