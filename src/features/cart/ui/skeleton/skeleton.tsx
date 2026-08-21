import { cn } from "@/components/cn";
import {
  MEDIA_IMAGE_ASPECT_RATIO,
  MEDIA_IMAGE_ASPECT_RATIO_CLASS,
} from "@/components/design-system/display/media-image/media-image.definition";
import { Skeleton } from "@/components/design-system/status/skeleton/skeleton";

/** 枠だけで見せる明細の行数。多すぎると、実際より入っているように見える。 */
const PLACEHOLDER_ROWS = 3;

const ROWS = Array.from({ length: PLACEHOLDER_ROWS }, (_, index) => index);

/**
 * カートの待機表示。
 *
 * @remarks
 * 出来上がりと同じ段組みで枠だけを出します。明細が先に出て集計が後から現れる形にすると、
 * 読み始めた位置が動きます。
 *
 * **サムネイルの枠は明細行と同じ寸法で持ちます。** 枠を持たないと、明細が届いた瞬間に文字の
 * 開始位置が画像 1 枚ぶん右へ動きます。器の幅による縮みも同じで、片方だけ固定すると狭い器で
 * ずれ方が変わります。
 */
export function CartSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-8 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        {ROWS.map((row) => (
          <div className="@container/line flex items-start gap-4" key={row}>
            <Skeleton
              className={cn(
                "w-12 shrink-0 @sm/line:w-16",
                MEDIA_IMAGE_ASPECT_RATIO_CLASS[MEDIA_IMAGE_ASPECT_RATIO.SQUARE],
              )}
            />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-8 w-28" />
          </div>
        ))}
      </div>
      <div className="flex w-full flex-col gap-4 rounded-lg border p-4 lg:w-80">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}
