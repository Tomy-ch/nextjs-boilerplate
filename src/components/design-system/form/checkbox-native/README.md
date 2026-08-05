# CheckboxNative

## 用途

二値の同意・設定・複数選択を native form として送信します。

## 役割と公開 component

| Component | 役割 |
| --- | --- |
| `CheckboxNative` | native `input[type="checkbox"]` を保持した、SSR first の checkbox です。form の値として送信できます。 |

## 利用ケース

通常の checkbox 入力に `name` と `value` を与えて使います。

## 責務境界

indeterminate や custom interaction は持ちません。それらが必要な場合だけ `CheckboxClient` を検討します。

## Storybook とテスト

Storybook は通常・checked・disabled・invalid を、テストは form 属性・選択操作・a11y を確認します。
