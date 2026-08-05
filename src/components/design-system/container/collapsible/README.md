# Collapsible

## 用途

一つの補助内容を、必要なときだけ開いて確認できるようにします。

## 役割と公開 component

| Component | 役割 |
| --- | --- |
| `Collapsible` | native の `details` による一つの開閉領域です。 |
| `CollapsibleTrigger` | native の `summary` として、領域の見出しと開閉操作を提供します。 |
| `CollapsibleContent` | 開いたときに表示する補助内容です。 |

## 利用ケース

注記、補足設定、長い説明など、一つのまとまりを段階表示する場合に使います。

## 責務境界

SSR first の native `details` / `summary` であり、hydration は不要です。外部 state との同期、開閉 animation、非標準の keyboard 操作は持ちません。それらが必要になった場合だけ client island を追加します。

## Storybook とテスト

Storybook は閉じた状態と初期状態で開いた表示を示し、初期 open は Controls、native の `toggle` は Actions で確認できます。test は native 開閉、初期 open、a11y を確認します。
