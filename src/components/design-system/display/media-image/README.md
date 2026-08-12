# MediaImage

## 用途

`next/image` を使い、比率固定・CSS Skeleton・LCP 用 preload を一貫して適用します。

## 役割と公開 component

| Component / 定数 | 役割 |
| --- | --- |
| `MediaImage` | `next/image` を比率固定の wrapper に収め、既定で CSS Skeleton を下層に表示します。 |
| `MEDIA_IMAGE_ASPECT_RATIO` | `square`、`standard`、`wide` の固定比率を選ぶ定数です。 |

## 利用ケース

一覧・詳細・説明内の画像に使います。通常画像は Skeleton を既定にし、LCP 候補だけは `preload` を指定して Skeleton を省略します。`placeholder="blur"` と `blurDataURL` も明示時に使えます。

画像が未設定の対象を並べる場所では、`src` に `null` を渡したうえで `fallbackSrc` に代替画像を指定します。

## 責務境界

Server Component であり、`imagePath` からの URL 組み立て、画像の取得状態、読み込み失敗時の fallback、業務上の alt 文は持ちません。これらは feature / model が所有します。blur は static import または利用側が明示的に渡す場合に利用可能ですが、バックエンド由来画像の通常 API 契約には含めません。

### 画像が無い場合の差し替え

`src` は `null` を受け取ります。「画像が無い」を呼び出し側の分岐で表すと、枠を出すのか出さないのか、代わりに何を出すのかが呼び出し側ごとに分かれるため、経路の選択をこの component に閉じています。

| `src` | `fallbackSrc` | 描画 |
| --- | --- | --- |
| あり | — | `src` の画像 |
| なし | あり | `fallbackSrc` の画像 |
| なし | なし | 何も描画しない（枠も出ません） |

**代替画像のパスは持ちません。** どの画像を代わりに置くかは対象の性質で決まるため、呼び出し元が渡します。代替画像を出しているときの代替テキストは `fallbackAlt` が担い、既定は空文字です。代替画像は対象について何も語らないため、`alt` をそのまま流用しません。

これは読み込み**失敗**時の差し替えではありません。`onError` を持たないのは、失敗の検出が client runtime を要するためです。必要な場合は feature 側の client island が包みます。

## Storybook とテスト

Storybook は Skeleton・preload・明示的な blur を、テストは比率・Skeleton の省略・`next/image` props・a11y を確認します。
