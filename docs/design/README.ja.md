> **このファイルは [`README.md`](README.md) の日本語訳です。**
> 直接編集しないでください。変更は英語の canonical な `README.md` を先に更新し、そのうえでこの日本語訳を同期してください。
> エージェントが読むのは `README.md` だけです。このファイルは人間が読むための翻訳です。

# 設計リファレンス

主題ごとの**設計解説**を置く。1 つの主題について、役割・成り立ち・実装の在り処・間違えやすい点を 1 ページにまとめたものである。

## ここに置くもの・置かないもの

レイヤー別 README を置き換えるものではない。README が 1 つのレイヤーの窓口であるのに対し、ここは**レイヤーを跨ぐ 1 つの主題**を通しで説明する。

| 種類 | 置き場 |
| --- | --- |
| 選択肢からの選定・意図的にやらない判断 | [`docs/adr/`](../adr/) |
| 日々強制される制約 | [`docs/rules.md`](../rules.ja.md) |
| レイヤーごとの責務と受け入れ範囲 | 各レイヤーの `README.md` |
| **主題ごとの設計解説** | **ここ** |

判断そのものは ADR が持つ。ここが持つのは、その判断を読むために要る前提と、実装を読んだうえでの説明である。両者が食い違う場合は ADR を優先する（[ADR 0140](../adr/0140-documentation-operations.ja.md)）。

## 文書

| 文書 | 主題 | 扱う範囲 |
| --- | --- | --- |
| [rendering.md](rendering.ja.md) | レンダリング | Server / Client Component・SSR・hydration・Server Action の用語と、取り違えたときに起きること |
| [placement.md](placement.ja.md) | 置き場 | 表示・hook・client 状態をどこへ置くか。判断の順序と、引き当てを間違えやすい点 |
| [design-system.md](design-system.ja.md) | デザインシステム | token からコンポーネントまでの積み上がり、区画の切り方、上流コンポーネントの取り込み、重なり順、カタログ |
| [forms.md](forms.ja.md) | 入力と送信 | 入力欄から Server Action、結果の見せ方まで。3 つの hook が見ているツリーと、値を誰が持つか |
| [data-fetching.md](data-fetching.ja.md) | 取得と契約 | 契約から生成物、生成物から表示の型まで。fetch wrapper・エラーの正規化・分類の関門 |
| [auth.md](auth.ja.md) | 認証の前側 | 中継するが検証しない責務線、session の持ち方、保護の掛かる場所、開発用のエンドポイント |
| [security.md](security.ja.md) | 防御 | 配信ヘッダと CSP、データの分類、`NEXT_PUBLIC_` の境界、エントリポイントが持つもの |
| [observability.md](observability.ja.md) | 観測 | 2 つのカーネルの分担、1 本の trace の繋がり方、中継のエンドポイント、レンダリングの計装 |
| [realtime-delivery.md](realtime-delivery.ja.md) | 購読と配信 | **まだ実体の無い** 購読 seam を実体化するときの形。発券から整列・再接続まで、どのレイヤーが何を持つか |
| [vrt.md](vrt.ja.md) | 見た目の固定 | ベースライン画像が何を守り、何を守らないか。揺らぎの止め方 |
| [context-map.md](context-map.ja.md) | 接触点の地図 | 外と触れる場所の一覧と、辺ごとの境界の所有・翻案の有無。仕組みは各主題の文書が持ち、ここは指すだけ |

## 読み方

主題ごとに独立している。全部を読む必要はなく、いま触っている主題のものだけを読めばよい。
