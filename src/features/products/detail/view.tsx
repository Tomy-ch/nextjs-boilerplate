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
import { Badge } from "@/components/design-system/display/badge/badge";
import {
  KeyValueEmpty,
  KeyValueItem,
  KeyValueLabel,
  KeyValueList,
  KeyValueValue,
} from "@/components/design-system/display/key-value-list/key-value-list";
import { MediaImage } from "@/components/design-system/display/media-image/media-image";
import { MEDIA_IMAGE_ASPECT_RATIO } from "@/components/design-system/display/media-image/media-image.definition";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/design-system/navigation/breadcrumb/breadcrumb";
import { RichTextContent } from "@/components/design-system/rich-text/rich-text-content/rich-text-content";
import { ActionBar } from "@/components/patterns/action-bar/action-bar";
import { ACTION_BAR_POSITION } from "@/components/patterns/action-bar/action-bar.definition";
import { formatDateTime } from "@/model/datetime";
import { NO_IMAGE_URL } from "@/model/media";
import type { Product } from "@/model/product/product";
import { SanitizedRichText } from "@/model/rich-text/sanitized-rich-text";

import { PRODUCT_LIST_PATH } from "../facade/list-url/list-url";
import { AddToCartButton } from "../ui/add-to-cart-button/add-to-cart-button";
import { PrintButton } from "./ui/print-button/print-button";

const DESCRIPTION_HEADING_ID = "product-description";

/** slide を指す `id`。送り操作と一覧の双方が同じ規則で参照する。 */
function slideIdOf(index: number): string {
  return `product-image-${index + 1}`;
}

type ProductDetailProps = {
  readonly product: Product;
  /** 表示順に並べた画像 URL。解決は feature 側の取得で済ませておく。 */
  readonly imageUrls: readonly string[];
};

/**
 * 商品 1 件の詳細表示。
 *
 * @remarks
 * description は生の HTML 文字列としては扱わず、`SanitizedRichText` を経由して
 * `RichTextContent` へ渡します。feature が文字列を持つと、渡す前に sanitize したかどうかが
 * 呼び出し側の規律の問題になります。
 *
 * 画像は枚数によらず carousel に載せ、送り先の一覧を必ず下に並べます。枚数で構造を変えると境界で
 * 見た目が動き、1 枚の商品と複数枚の商品が別の画面に見えます。1 枚も無い場合は代替画像を 1 枚として
 * 置きます。
 *
 * 在庫が少ないかどうかの境界はバックエンドが `stockWarningThreshold` で供給します。ここが持つのは
 * 境界を跨いだ時に何を見せるかだけです。
 *
 * パンくずを置くのは、一覧・分類・トップのどこからでも入る画面で、global nav から 1 手で戻れない
 * 祖先を持つためです（[0026](../../../../docs/adr/0026-layout-shell-mount.md)）。示すのは辿った
 * 経路ではなくサイト構造上の階層です。
 *
 * 紙に出すのは内容だけです。押せない操作（パンくず・画像の送り・一覧・カートへの追加・印刷そのもの）
 * は紙面の場所を取るだけなので落とします。画像は先頭の 1 枚だけを残し、幅も抑えます。carousel は
 * 横に送って見る形で、紙では送れないため全部並べると同じ商品の写真が紙を埋め、幅を抑えないと
 * 1 枚でも紙 1 面を占めて肝心の値が次の紙へ送られます。
 */
export function ProductDetail({ product, imageUrls }: ProductDetailProps) {
  const slides = imageUrls.length === 0 ? [null] : imageUrls;
  const isLowStock =
    product.stockWarningThreshold !== null && product.quantity <= product.stockWarningThreshold;

  return (
    <article className="flex flex-col gap-8 pb-24 lg:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Breadcrumb className="print-hidden">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">トップ</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href={PRODUCT_LIST_PATH}>商品一覧</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{product.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <PrintButton />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Carousel aria-label={`${product.name}の画像`} className="print:max-w-64">
          <CarouselContent>
            {slides.map((src, index) => (
              <CarouselItem
                aria-label={`${index + 1} / ${slides.length}`}
                className={index === 0 ? undefined : "print-hidden"}
                id={slideIdOf(index)}
                key={slideIdOf(index)}
              >
                {index === 0 ? null : (
                  <CarouselPrevious
                    className="print-hidden"
                    href={`#${slideIdOf(index - 1)}`}
                    tabIndex={-1}
                  />
                )}
                <MediaImage
                  alt={product.name}
                  className="rounded-lg border border-border"
                  fallbackAlt="画像なし"
                  fallbackSrc={NO_IMAGE_URL}
                  preload={index === 0}
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  src={src}
                />
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

        <div className="flex flex-col items-start gap-6">
          <div className="flex flex-wrap items-center gap-2">
            {/* 長さの上限をバックエンドが決める値なので、1 行に収まる前提を置けない。 */}
            <Badge className="whitespace-normal break-words" variant="secondary">
              {product.category.name}
            </Badge>
            <Badge className="whitespace-normal break-words" variant="outline">
              {product.status.name}
            </Badge>
          </div>

          <h1 className="text-3xl font-semibold tracking-tight">{product.name}</h1>

          <p className="text-3xl font-semibold">{`$${product.price}`}</p>

          <KeyValueList className="w-full">
            <KeyValueItem>
              <KeyValueLabel>在庫</KeyValueLabel>
              <KeyValueValue className="flex flex-wrap items-center gap-2">
                {`${product.quantity} 個`}
                {product.quantity === 0 ? <Badge variant="destructive">在庫なし</Badge> : null}
                {product.quantity > 0 && isLowStock ? (
                  <Badge variant="outline">残りわずか</Badge>
                ) : null}
              </KeyValueValue>
            </KeyValueItem>
            <KeyValueItem>
              <KeyValueLabel>公開日時</KeyValueLabel>
              <KeyValueValue>
                {product.publishedAt === null ? (
                  <KeyValueEmpty>未公開</KeyValueEmpty>
                ) : (
                  formatDateTime(product.publishedAt)
                )}
              </KeyValueValue>
            </KeyValueItem>
          </KeyValueList>

          <ActionBar
            className="w-full print-hidden"
            position={ACTION_BAR_POSITION.FIXED_WITHOUT_ASIDE}
          >
            <AddToCartButton
              line={{
                productId: product.id,
                name: product.name,
                price: product.price,
                statusName: product.status.name,
                imageUrl: imageUrls[0] ?? null,
                stockQuantity: product.quantity,
              }}
            />
          </ActionBar>
        </div>
      </div>

      {product.description === null ? null : (
        <section aria-labelledby={DESCRIPTION_HEADING_ID} className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold" id={DESCRIPTION_HEADING_ID}>
            商品説明
          </h2>
          <RichTextContent content={SanitizedRichText.from(product.description)} />
        </section>
      )}
    </article>
  );
}
