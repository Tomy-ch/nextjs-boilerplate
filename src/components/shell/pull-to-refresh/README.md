# PullToRefresh

## 用途

画面の上端から引き下げて、いまの route を取り直します。touch のある環境でだけ働きます。

## 役割と公開 component

| Component | 役割 |
| --- | --- |
| `PullToRefresh` | 引き下げを受け付け、実行の域を超えたら `router.refresh()` を呼びます。目印の描画も持ちます。 |

`PULL_STATE`・`TRIGGER_DISTANCE`・`RESISTANCE`・`MAX_DISTANCE`・`APPEAR_DISTANCE` は `pull-to-refresh.definition.ts` が owner です。引き下げの観測は `use-pull-gesture.ts` が持ちますが、公開 API ではありません。

## 利用ケース

器へ一度だけ置きます。`AppShell` が内部で mount しているため、通常は呼び出し側が意識する必要はありません。

何を取り直すかは知りません。`router.refresh()` はサーバに現在の route を描き直させるだけなので、どの画面に置いても同じ意味になります。画面ごとの再取得の中身はそれぞれの画面が持ちます。

## 設計

- **ブラウザ既定の引き下げ更新は、この部品が載っている間だけ止めます。** 静的な CSS に `overscroll-behavior` を書くと、この部品を載せていないページでも既定が消え、引いても何も起きない状態が残ります
- **`router.refresh()` はブラウザの再読み込みとは別物です。** client state が保たれるため、開いている入力や一時的な選択が消えません
- **進行の判定は `useTransition` に委ねます。** `router.refresh()` は完了を返さないため、自前で時間を決めて畳むと実際の取得とずれます
- **modal が開いている間は引けません。** 判定は modal の 2 通りの名乗り方 —— 面が `aria-modal` を立てる形と、背面を `aria-hidden` / `inert` で閉じる形 —— の両方を見ます。どちらも ARIA の語彙であって、特定の overlay ライブラリの印ではありません。片方だけでは効きません。同梱の overlay が使う Radix は後者しか採らず、`aria-modal` を出しません。背面が閉じているかは `main` を起点に見ます。触れた要素から辿ると、装飾のアイコンに付く `aria-hidden` を modal と取り違えます
- **touch を持たない環境では何も描きません。** 引く手段が無い場所に目印だけ出しても操作へつながりません。サーバでも同じ判定になるため、hydration の前後で配置は動きません

## 注意

**読み進める一覧を持つ画面では、取り直しても表示が変わらないことがあります。** 積み上げた結果を client state に持つ実装では、サーバが返す最初のページが差し替わっても state が入れ替わらないためです。取り直しを反映させる側は、取得結果から鍵を作って積み上げを捨てる必要があります。

**iOS の `overscroll-behavior` の効き方は端末差があります。** 実機での確認が要ります。
