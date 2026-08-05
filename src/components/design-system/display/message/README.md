# Message

## 用途

送信者と本文を持つ 1 件のメッセージを表示します。会話、通知、状態遷移の記録のように「誰が・いつ・何を」を時系列で並べる面で、1 件ぶんの構造と、続けて表示する塊の間隔を担います。

## 役割と公開 component

| Component | 役割 |
| --- | --- |
| `MessageGroup` | 続けて表示するメッセージをひとまとまりとして縦に並べる領域です。間隔だけを持ち、role は持ちません。 |
| `Message` | 1 件のメッセージ全体です。`align` で avatar と本文の左右を入れ替えます。 |
| `MessageAvatar` | 送信者を示す円形の枠です。中身は呼び出し元が置きます。 |
| `MessageContent` | 本文と、その前後に置く補助情報を縦に並べる領域です。 |
| `MessageHeader` | 本文の前に置く、送信者名や時刻などの補助情報です。 |
| `MessageFooter` | 本文の後ろに置く、送信状態や補助操作などの情報です。 |

`MESSAGE_ALIGN` と `MessageAlign` を `message.definition.ts` で公開します。`align` に指定できる値の owner はこの定義であり、`"end"` などの文字列を利用側で直接書きません。

| align | 見え方 |
| --- | --- |
| `start` | avatar を先頭、本文をその後ろに置きます。既定値です。 |
| `end` | avatar と本文の並びを反転し、本文の内容を右端へ寄せます。 |

## 利用ケース

- 二者のやり取りを、送信者ごとに左右へ分けて時系列で並べる場合
- 同じ送信者の連続した発言を `MessageGroup` で一つの塊として見せる場合
- 送信状態や再送のような補助操作を、本文の後ろへ `MessageFooter` として添える場合
- avatar を持たない通知を、送信者名と時刻だけの `MessageHeader` とともに並べる場合

吹き出しの面（背景・角丸・尾）は持ちません。本文の見た目は `MessageContent` の子として呼び出し元が組みます。日付の区切りのような一行の注釈には `Marker` を、読み落とされては困る通知には `Alert` を使います。

## 責務境界

SSR first の選定では `◎` に当たります。hydration を必要としない表示専用の Server Component で、client island を持ちません。`MessageAvatar` の中で画像の読み込み結果に応じた切り替えが必要な場合だけ、client island である `Avatar` を子として合成します。

メッセージの取得、並び順、どこで塊を切るかの判断、日時の整形、本文の sanitize は持ちません。いずれも呼び出し元が決め、この component は整形済みの内容を子として受け取ります。sanitize 済みの Markdown / HTML を本文に表示する場合は `Typeset` を併用します。

`align` は avatar と本文の左右を入れ替えるだけの視覚的な区別で、意味論を持ちません。支援技術は向きを読み上げないため、誰の発言かは `MessageHeader` のテキストとして必ず示します。

`align="end"` のとき `MessageContent` が右端へ寄せるのは `data-slot` を持つ直下の子だけです。`p` のような素の要素を本文に置く場合はこの規則が働かないため、呼び出し元が幅を内容に合わせたうえで右端へ寄せます。Storybook では吹き出し用の局所 component を story 内に置き、この指定を含めた形で示しています。

`MessageGroup` と `Message` はいずれも role を持ちません。会話や通知の一覧であることを支援技術へ伝える必要がある場合は、呼び出し元が `role` とアクセシブルな名前を与えます。名前のない `list` をこの component 側の既定にすると、読み上げに意味のない入れ子が増えるためです。

`MessageAvatar` は隣に送信者名がある限り装飾です。中に画像を置く場合は `alt` を空にし、avatar だけで送信者を特定させる設計にしません。

`MessageHeader` と `MessageFooter` は、メッセージ内に `data-variant="ghost"` を持つ面がある場合に左右の余白を外します。吹き出しの面を持たない variant と組み合わせるための指定で、この component 自身は `data-variant` を出力しません。

vendor 依存はありません。`cn` だけを使います。

## Storybook とテスト

Storybook は既定のメッセージ、`start` / `end` を並置した向きの違い、avatar を持たない場合、`MessageFooter` を添えた場合（avatar が本文の高さに合わせて上へずれる）、`MessageGroup` による連続表示、長い本文と区切りのない連続文字列の折り返しを確認します。左右の反転、footer に追従する avatar の位置、折り返しはいずれも実描画でしか判断できないため、Storybook 側の確認範囲です。

テストは既定が `start` 向きの `div` であること、`align` を `data-align` として公開すること、送信者と本文が向きに依存しない読み上げ順のテキストとして残ること、各領域を `data-slot` で識別できること、既定ではいずれの要素も role を持たないこと、`MessageFooter` に置いた操作へ到達できること、`MessageGroup` が複数のメッセージを含み呼び出し元の `role` とアクセシブルな名前を保つこと、a11y 自動検査を確認します。
