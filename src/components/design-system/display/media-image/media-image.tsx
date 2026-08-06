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
  "className" | "fill" | "loader" | "onError" | "onLoad" | "preload" | "priority"
> & {
  /** レイアウトシフトを防ぐ wrapper の比率。 */
  aspectRatio?: MediaImageAspectRatio;
  /** wrapper に追加する class 名。 */
  className?: string;
  /** 実画像に追加する class 名。 */
  imageClassName?: string;
  /** CSS Skeleton を表示するか。LCP 候補では既定で無効になる。 */
  showSkeleton?: boolean;
  /** LCP 候補として preload するか。 */
  preload?: boolean;
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
 * @see Storybook `Display/MediaImage`
 */
export function MediaImage({
  alt,
  aspectRatio = MEDIA_IMAGE_ASPECT_RATIO.STANDARD,
  className,
  imageClassName,
  preload = false,
  showSkeleton = !preload,
  sizes = "100vw",
  ...props
}: MediaImageProps) {
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
        alt={alt}
        className={cn("object-cover", imageClassName)}
        data-slot="media-image-image"
        fill
        preload={preload}
        sizes={sizes}
        {...props}
      />
    </div>
  );
}
