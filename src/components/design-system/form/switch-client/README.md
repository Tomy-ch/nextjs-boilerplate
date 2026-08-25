# SwitchClient

## 用途

設定の入り / 切りを切り替え、結果を即座に画面へ反映します。

## 役割と公開 component

| Component | 役割 |
| --- | --- |
| `SwitchClient` | 切り替えを React state として扱う client island の switch です。 |

表示サイズの定数 `SWITCH_SIZE` は [`switch-native`](../switch-native/README.md) が owner です。native と client で見た目が揃わないと、同じ画面に両方が現れたときに別部品に見えるため、値を共有します。

## 利用ケース

切り替えた結果をその場で反映する設定、楽観更新して失敗時に元へ戻す操作、複数の switch を互いに同期させる場面に使います。

## SwitchNative との使い分け

hydration の要否が分かれ目です。form 送信と初期表示だけで足りるなら SSR first の [`SwitchNative`](../switch-native/README.md) を使います。この部品を選ぶのは、browser state が必要な要件が確定した場合に限ります。

もう一つの違いは読み上げです。この部品は Radix が `role="switch"` と `aria-checked` を状態と対応させて付与するため、支援技術へ「入り / 切り」として伝わります。`SwitchNative` は uncontrolled な native input なので `aria-checked` を同期できず、checkbox として読み上げられます。支援技術へ switch として伝えることが要件なら、この部品を選びます。

## Toggle との使い分け

見た目が似ていても責務が違います。分かれ目は「**設定を変えるのか、今の見え方を変えるのか**」です。

| | `Switch` | `Toggle` |
| --- | --- | --- |
| 意味論 | `checkbox` / `switch` | `button` + `aria-pressed` |
| 表すもの | 設定の入り / 切り（通知を受け取る、公開する） | 表示の適用状態（今この見え方になっている） |
| 送信値 | **持つ**（form の値になる） | 持たない（操作ボタン） |
| 効き方 | 保存して永続する | その画面の見せ方を変える |
| 例 | 通知の受け取り、公開 / 非公開 | 表示密度、折り返しの有無 |

保存されて次に開いたときも残るなら `Switch`、その場の見え方だけなら [`Toggle`](../../action/toggle/README.md) です。排他や複数選択の切り替え群になる場合は `ToggleGroup` を使います。

## 責務境界

切り替えの結果をどう保存するか、失敗時にどう戻すかは持ちません。`checked` / `onCheckedChange` を通じて呼び出し元が扱います。ラベルも持たないため、何の設定かは `Label` などで関連付けます。

Server Component からは直接 render できません。`role="switch"` は Radix が付与します。

vendor は現在 Radix ですが、公開 API に vendor 名は含めません。

## Storybook とテスト

Storybook は切り替え結果の即時反映、disabled、表示サイズ、複数 switch の同期を確認します。テストは `switch` として読み上げられること、操作が state として扱われ結果が反映されること、disabled、`size` の data 属性が `SwitchNative` と同じ既定値になること、a11y 自動検査を確認します。
