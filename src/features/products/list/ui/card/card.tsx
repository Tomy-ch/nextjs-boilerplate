import Link from "next/link";

import { Badge } from "@/components/design-system/display/badge/badge";
import { Card } from "@/components/design-system/display/card/card";
import { MediaImage } from "@/components/design-system/display/media-image/media-image";
import type { MediaImagePriority } from "@/components/design-system/display/media-image/media-image.definition";
import { AddToCartButton } from "@/features/cart/facade/add-to-cart/add-to-cart-button";
import { NO_IMAGE_URL } from "@/model/media";
import type { ProductListItem } from "@/model/product/product";
import { withPartSpan } from "@/observability/render-span";
import { ProductContactButton } from "../contact-button/contact-button";

/** `ProductCard` の props。 */
export type ProductCardProps = {
  /** 表示する商品。 */
  item: ProductListItem;
  /** 画像の読み込み優先度。折り返し前に見える位置なら `preload` を渡す。 */
  imagePriority?: MediaImagePriority;
};

/**
 * 一覧に並ぶ商品 1 件。
 *
 * @remarks
 * `components` へ上げていない理由とカード全体を link で包まない組み方は、
 * [products の README](../../../README.md)「運用」にまとまっています。
 *
 * 分岐は器の幅で行います（`docs/rules.md`「レイアウトと帯」の「部品の中身は帯で分岐させず
 * コンテナクエリで書く」）。狭い器では画像を上に積み、広い器では横へ並べます。
 *
 * **指を乗せたことを面で返します。** 押せる範囲が商品名の文字だけに見えないようにするためで、
 * link そのものの focus 表示とは別に要ります。
 *
 * **在庫が無い商品には問い合わせの入口を並べます。** カートへ入れる操作は押せないままにしてあり、
 * それだけでは「買えない」ことしか伝わりません。入荷を待つ以外の道をその場に出します。
 *
 * @param props - 表示する商品と画像の読み込み優先度。
 */
export const ProductCard = withPartSpan(
  "features/products/list/ui/card/card",
  ({ item, imagePriority }: ProductCardProps) => {
    return (
      <Card className="@container/card relative flex h-full flex-col gap-0 overflow-hidden py-0 transition-[border-color,box-shadow] hover:border-foreground/25 hover:shadow-md">
        <div className="flex flex-col @sm/card:flex-row">
          <MediaImage
            alt={item.name}
            className="@sm/card:w-40 @sm/card:shrink-0"
            fallbackAlt="画像なし"
            fallbackSrc={NO_IMAGE_URL}
            priority={imagePriority}
            sizes="(min-width: 1024px) 160px, 100vw"
            src={item.imageUrl}
          />
          <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
            <p className="font-emphasis break-words">
              <Link
                className="rounded-xs after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-active focus-visible:shadow-glow-primary"
                href={`/products/${item.id}`}
              >
                {item.name}
              </Link>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {/* 長さの上限をバックエンドが決める値なので、1 行に収まる前提を置けない。 */}
              <Badge className="whitespace-normal break-words" variant="secondary">
                {item.categoryName}
              </Badge>
              <Badge className="whitespace-normal break-words" variant="outline">
                {item.statusName}
              </Badge>
              {item.quantity === 0 ? <Badge variant="destructive">在庫なし</Badge> : null}
            </div>
            <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                {/* 通貨は表示の直前で付ける。価格は decimal 文字列のまま持ち回っており、
                    数値へ変換するとサブセント精度が落ちる。 */}
                <span className="font-emphasis">${item.price}</span>
                <span className="text-muted-foreground text-sm">在庫 {item.quantity}</span>
              </div>
              <div className="relative flex flex-wrap items-center gap-2">
                {item.quantity === 0 ? <ProductContactButton /> : null}
                <AddToCartButton
                  placement="list"
                  productId={item.id}
                  stockQuantity={item.quantity}
                />
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  },
);
