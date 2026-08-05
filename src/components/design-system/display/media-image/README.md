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

## 責務境界

Server Component であり、`imagePath` からの URL 組み立て、画像の取得状態、読み込み失敗時の fallback、業務上の alt 文は持ちません。これらは feature / model が所有します。blur は static import または利用側が明示的に渡す場合に利用可能ですが、バックエンド由来画像の通常 API 契約には含めません。

## Storybook とテスト

Storybook は Skeleton・preload・明示的な blur を、テストは比率・Skeleton の省略・`next/image` props・a11y を確認します。
