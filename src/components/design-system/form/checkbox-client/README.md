# CheckboxClient

## 用途

indeterminate を含む custom checkbox 操作を client island として提供します。

## 役割と公開 component

| Component | 役割 |
| --- | --- |
| `CheckboxClient` | Radix を使い、checked・unchecked・indeterminate を操作できる client-side checkbox です。 |

indeterminate は checked と別の印（横線）で示します。同じ印だと背景の塗りだけが違う状態になり、「一部選択」と「選択済み」が一目で区別できません。

## 利用ケース

native checkbox では満たせない状態表現や操作要件がある場面に限定します。

## 責務境界

初期表示の既定ではありません。項目名は `Label` または `aria-label` で与え、状態・送信・検証は feature が管理します。

## Storybook とテスト

Storybook は通常・checked・disabled・invalid を、テストは選択状態・disabled・a11y を確認します。
