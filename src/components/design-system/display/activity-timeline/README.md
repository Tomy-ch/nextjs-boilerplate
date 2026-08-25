# ActivityTimeline

## 用途

起きた出来事を時刻順に並べて表示します。変更履歴、操作ログ、監査ログが該当します。

## 役割と公開 component

| Component | 役割 |
| --- | --- |
| `ActivityTimeline` | 出来事を並べる `ol`。履歴の名前を必ず与えます。 |
| `ActivityTimelineItem` | 出来事 1 件。先頭に印を置けます。 |
| `ActivityTimelineTime` | 出来事が起きた時刻。表示用の文字列と機械可読な値の両方を持ちます。 |

内容は `ListItemContent` / `ListItemTitle` / `ListItemDescription` で組み立てます。

## `Stepper` との使い分け

| | `Stepper` | `ActivityTimeline` |
| --- | --- | --- |
| 対象 | 既知で有限の段階 | 未知の件数の履歴 |
| 焦点 | 現在位置と、まだ到達していない先 | 過去に起きたこと |
| 順序 | 定義順。増減しない | 時刻順。増え続ける |
| 件数 | 固定 | pagination / lazy load を伴う |

縦に時刻付きの項目を並べるという**表示の形が似ているだけ**で、別の概念です。統合しません。「次に取れる操作」と pagination は前提が矛盾するため、1 部品に入れると，どちらの前提でも破綻する API になります。

## 支援技術への伝え方

`ol` として並び順に意味があることを伝えます。同じ画面に複数の履歴があるとき名前が無いとどちらか判らないため、`label` は必須です。

**`role="feed"` は使いません。** あの role は記事単位の keyboard 操作と `aria-busy` の管理を約束することになり、この部品はそれを持たないためです。

先頭の印は装飾（`aria-hidden`）です。誰が何をしたかは `ListItemTitle` の文言が伝えます。印だけが actor を示す作りにしません。

## 時刻の扱い

`ActivityTimelineTime` は表示用の文字列と `dateTime` の両方を必ず受け取ります。表示だけだと「3 日前」のような相対表記で正確な時刻が失われ、`dateTime` だけだと読み手に伝わりません。

整形はこの部品が持ちません。locale ごとの表記は `model` の formatter が決めます。

## 責務境界

並び順、event の意味、取得、件数の追加読み込みは持ちません。新しい順に並べるか古い順に並べるかは呼び出し元が決めます。

続きの読み込みは [`cursor-pagination`](../../../app-starter/cursor-pagination/README.md) を隣に合成します。URL の組み立ては呼び出し元の責務です。

## Storybook とテスト

Storybook は新しい順、印を渡さない場合、1 件だけの場合、pagination と併せた場合、古い順を確認します。テストは `ol` と名前、渡された順序をそのまま並べること、keyboard 操作を約束する role を持たないこと、印が装飾であること、時刻が両方の値を持つこと、a11y 自動検査を確認します。
