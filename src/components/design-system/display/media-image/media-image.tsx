import Image, { type ImageProps } from "next/image";

import { cn } from "@/components/cn";
import { Skeleton } from "../../status/skeleton/skeleton";
import {
  MEDIA_IMAGE_ASPECT_RATIO,
  MEDIA_IMAGE_ASPECT_RATIO_CLASS,
  type MediaImageAspectRatio,
} from "./media-image.definition";

/** `MediaImage` の props。`blurDataURL` は明示時だけ `placeholder="blur"` と組み合わせて使う。 */
export type MediaImageProps = Omit<
  ImageProps,
  "className" | "fill" | "loader" | "onError" | "onLoad" | "preload" | "priority" | "src"
> & {
  /** レイアウトシフトを防ぐ wrapper の比率。 */
  aspectRatio?: MediaImageAspectRatio;
  /** wrapper に追加する class 名。 */
  className?: string;
  /** 代替画像の代替テキスト。既定は空文字で、装飾として扱われる。 */
  fallbackAlt?: string;
  /** `src` が無いときに表示する画像。これも無ければ何も描画しない。 */
  fallbackSrc?: ImageProps["src"];
  /** 実画像に追加する class 名。 */
  imageClassName?: string;
  /** CSS Skeleton を表示するか。LCP 候補では既定で無効になる。 */
  showSkeleton?: boolean;
  /** LCP 候補として preload するか。 */
  preload?: boolean;
  /** 表示する画像。未設定なら `fallbackSrc` を表示する。 */
  src: ImageProps["src"] | null;
};

/**
 * `next/image` と CSS Skeleton を合成する、SSR first のメディア表示 component。
 *
 * @remarks
 * 既定は CSS Skeleton を実画像の下に置き、画像が描画されるまで形状だけを表示する。LCP 候補は
 * `preload` を指定して Skeleton を省略する。`placeholder="blur"` と `blurDataURL` は API として
 * 透過するが、バックエンド由来画像の通常経路ではレスポンスを肥大させないため既定にしない。
 *
 * error fallback や読み込み完了に応じた表示切替が必要な場合は、これを包む client island を feature
 * 側に置く。`imagePath` から URL を組み立てる責務も feature / model 側に置く。
 *
 * 画像が無いときに何を出すかは呼び出し元が決める。`src` に `null` を渡せる形にしてあるのは、
 * 「無い」を分岐で表すと呼び出し側ごとに扱いが分かれるためである。差し替える画像は
 * `fallbackSrc` で受け取り、この component は経路を選ぶだけで既定のパスを持たない。どちらも
 * 無ければ枠ごと描画しない。
 *
 * @see Storybook `Display/MediaImage`
 */
export function MediaImage({
  alt,
  aspectRatio = MEDIA_IMAGE_ASPECT_RATIO.STANDARD,
  className,
  fallbackAlt = "",
  fallbackSrc,
  imageClassName,
  preload = false,
  showSkeleton = !preload,
  sizes = "100vw",
  src,
  ...props
}: MediaImageProps) {
  const resolved = src ?? fallbackSrc;

  if (resolved === undefined) {
    return null;
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-muted",
        MEDIA_IMAGE_ASPECT_RATIO_CLASS[aspectRatio],
        className,
      )}
      data-slot="media-image"
    >
      {showSkeleton ? <Skeleton className="absolute inset-0 rounded-none" /> : null}
      <Image
        alt={src === null || src === undefined ? fallbackAlt : alt}
        className={cn("object-cover", imageClassName)}
        data-slot="media-image-image"
        fill
        preload={preload}
        sizes={sizes}
        src={resolved}
        {...props}
      />
    </div>
  );
}
