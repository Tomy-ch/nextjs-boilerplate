# FormField

## 用途

項目名・必須の印・入力欄・補足・誤りを、どの入力欄の種類でも同じ並びで組みます。

## 役割と公開 component

| Component | 役割 |
| --- | --- |
| `FormField` | 外枠。label と必須の印を組み、children として渡された入力欄の下へ補足と誤りを置きます。 |

`fieldControlAttributes()`（`field-attributes.ts`）は、入力欄そのものへ与える a11y 属性を組む純関数です。外枠と対で使います。

## 利用ケース

複数の項目を並べるフォームに使います。text・select・入力欄と操作を並べた合成のいずれでも、
同じ外枠へ差し込みます。

入力欄が 1 つだけで補足も誤りも持たない場面には使いません。`Label` と control を直接並べる方が
読めます。

## 責務境界

**入力欄を持ちません。** children として受け取ります。種類ごとに外枠を作ると、誤りの位置も必須の
印の位置も種類ごとにずれていきます。

**`id` を生成しません。** 同じフォームを 1 つの文書へ 2 度置いたときに重複するため、生成は
`useId()` を持てる呼び出し元が行います。ここは受け取った `id` を label と誤りへ配るだけです。

**入力欄の ARIA 属性を付けません。** children を受け取る形である以上ここからは触れないので、
`aria-invalid` / `aria-describedby` / `aria-required` は**呼び出し元が入力欄へ与えます**。外枠が
持つのは `data-invalid` による見た目の切り替えまでです。

与える属性の**中身**は `fieldControlAttributes()` が決めます。項目の部品ごとに書き写すと、種類が
増えたときに `aria-invalid` や `aria-describedby` の付け忘れが起き、写しの数だけ食い違います。
誤りが無いときも `aria-invalid` を落とさず `false` で置くのは、属性ごと消すと支援技術にとって
「一度も検証していない」と区別が付かないためです。

```tsx
<FormField controlId={id} errorId={errorId} label="メールアドレス" message={message} required>
  <Input {...fieldControlAttributes({ controlId: id, errorId, message, required: true })} />
</FormField>
```

検証も、必須かどうかの判定も持ちません。どちらも呼び出し元が検証スキーマから導いて渡します
（[0062](../../../../docs/adr/0062-form-input-validation.md)）。

いつ誤りを出すか（focus が外れた時点か、変更のたびか）も持ちません。表示するかどうかを決めた
結果だけを `message` で受け取ります。

## Storybook とテスト

Storybook は必須・任意・誤りあり・補足ありと、select を差し込んだ場合を示します。テストは label と
入力欄の関連付け、誤りが無いときに誤りの要素を描画しないこと、a11y 自動検査を確認します。
`fieldControlAttributes()` は、誤りの有無で `aria-invalid` と `aria-describedby` が切り替わること、
必須が属性へ出ることを別に確認します。
