# Separator

## 用途

近接する内容のまとまりを区切ります。

## 役割と公開 component

| Component | 役割 |
| --- | --- |
| `Separator` | horizontal / vertical の区切り線です。意味論を持つ水平線か、装飾目的の線かを `decorative` で選べます。 |

## 利用ケース

詳細、補足、並列した情報を視覚的に区切る場面に使います。

## 責務境界

操作・状態・余白・業務上の意味付けは持ちません。装飾だけに使うか意味論を持たせるかは feature が決めます。

## Storybook とテスト

Storybook は horizontal / vertical を、テストは方向と a11y を確認します。
