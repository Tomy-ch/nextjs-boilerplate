import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/design-system/container/carousel/carousel";
import {
  CarouselLink,
  CarouselNext,
  CarouselPrevious,
  CarouselThumbnails,
} from "@/components/design-system/container/carousel/carousel-navigation";
import { MediaImage } from "@/components/design-system/display/media-image/media-image";
import {
  MEDIA_IMAGE_ASPECT_RATIO,
  MEDIA_IMAGE_PRIORITY,
} from "@/components/design-system/display/media-image/media-image.definition";
import { ImageViewer } from "@/components/design-system/overlay/image-viewer/image-viewer";
import { NO_IMAGE_URL } from "@/model/media";
import { withPartSpan } from "@/observability/render-span";

/** slide を指す `id`。送り操作と一覧の双方が同じ規則で参照する。 */
function slideIdOf(index: number): string {
  return `product-image-${index + 1}`;
}

/** `ProductGallery` の props。 */
export type ProductGalleryProps = {
  /** 画像の代替テキストになる商品名。 */
  readonly productName: string;
  /** 表示順に並べた画像 URL。解決は feature 側の取得で済ませておく。 */
  readonly imageUrls: readonly string[];
};

/**
 * 商品の画像を送りながら見る面。
 *
 * @remarks
 * 枚数によらず carousel に載せ、送り先の一覧を必ず下に並べます。枚数で構造を変えると境界で
 * 見た目が動き、1 枚の商品と複数枚の商品が別の画面に見えます。1 枚も無い場合は代替画像を
 * 1 枚として置きます。
 *
 * 実画像だけを押して拡大できます。代替画像は「画像が無い」ことを伝える表示であり、拡大しても
 * 得られるものがありません。押せる画像と押せない画像が混ざりますが、混ざるのは実画像が無い
 * 商品だけで、同じ商品の中で押せたり押せなかったりはしません。
 *
 * 紙には先頭の 1 枚だけを残し、幅も抑えます。carousel は横に送って見る形で、紙では送れないため
 * 全部並べると同じ商品の写真が紙を埋め、幅を抑えないと 1 枚でも紙 1 面を占めます。
 */
export const ProductGallery = withPartSpan(
  "features/products/detail/ui/gallery/gallery",
  ({ imageUrls, productName }: ProductGalleryProps) => {
    const slides = imageUrls.length === 0 ? [null] : imageUrls;
    const viewable = imageUrls.map((url) => ({ src: url, alt: productName }));

    return (
      <Carousel aria-label={`${productName}の画像`} className="print:max-w-64">
        <CarouselContent>
          {slides.map((src, index) => (
            <CarouselItem
              aria-label={`${index + 1} / ${slides.length}`}
              className={index === 0 ? undefined : "print-hidden"}
              id={slideIdOf(index)}
              key={slideIdOf(index)}
            >
              {src === null ? (
                <MediaImage
                  alt={productName}
                  className="rounded-lg border border-border"
                  fallbackAlt="画像なし"
                  fallbackSrc={NO_IMAGE_URL}
                  priority={MEDIA_IMAGE_PRIORITY.PRELOAD}
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  src={null}
                />
              ) : (
                <ImageViewer images={viewable} index={index}>
                  <MediaImage
                    alt={productName}
                    className="rounded-lg border border-border"
                    priority={
                      index === 0 ? MEDIA_IMAGE_PRIORITY.PRELOAD : MEDIA_IMAGE_PRIORITY.LAZY
                    }
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    src={src}
                  />
                </ImageViewer>
              )}
              {/* 送る操作は画像より後ろに置く。位置指定要素は DOM の順で重なるため、
                  前に置くと画像に覆われて押せない。 */}
              {index === 0 ? null : (
                <CarouselPrevious
                  className="print-hidden"
                  href={`#${slideIdOf(index - 1)}`}
                  tabIndex={-1}
                />
              )}
              {index === slides.length - 1 ? null : (
                <CarouselNext
                  className="print-hidden"
                  href={`#${slideIdOf(index + 1)}`}
                  tabIndex={-1}
                />
              )}
            </CarouselItem>
          ))}
        </CarouselContent>

        <CarouselThumbnails
          aria-label="画像の一覧"
          className="print-hidden"
          defaultCurrentId={slideIdOf(0)}
        >
          {slides.map((src, index) => (
            <CarouselLink
              aria-label={`${index + 1} 枚目`}
              className="w-20 shrink-0 p-0"
              href={`#${slideIdOf(index)}`}
              key={slideIdOf(index)}
            >
              <MediaImage
                alt=""
                aspectRatio={MEDIA_IMAGE_ASPECT_RATIO.SQUARE}
                className="w-full rounded-sm"
                fallbackSrc={NO_IMAGE_URL}
                sizes="5rem"
                src={src}
              />
            </CarouselLink>
          ))}
        </CarouselThumbnails>
      </Carousel>
    );
  },
);
