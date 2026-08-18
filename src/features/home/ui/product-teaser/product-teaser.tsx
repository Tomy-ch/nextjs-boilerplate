import Link from "next/link";

import { Card } from "@/components/design-system/display/card/card";
import { MediaImage } from "@/components/design-system/display/media-image/media-image";
import {
  MEDIA_IMAGE_ASPECT_RATIO,
  type MediaImagePriority,
} from "@/components/design-system/display/media-image/media-image.definition";
import { NO_IMAGE_URL } from "@/model/media";
import type { ProductListItem } from "@/model/product/product";

/** `ProductTeaser` の props。 */
export type ProductTeaserProps = {
  /** 表示する商品。 */
  item: ProductListItem;
  /** 画像の読み込み優先度。折り返し前に見える位置なら `preload` を渡す。 */
  imagePriority?: MediaImagePriority;
};

/**
 * トップに並べる商品 1 件。
 *
 * @remarks
 * 一覧のカードと別の部品にしてあります。一覧のカードは分類・状態・在庫とカートへ入れる操作を
 * 持ちますが、それは探している人が候補を絞るために要る情報です。トップに並ぶのは絞り込みの
 * 結果ではないため、同じ密度で並べると、まだ何も探していない人に判断材料だけが積まれます。
 *
 * カード全体を 1 つの link で包んでいます。一覧のカードが link で包まず疑似要素を使うのは
 * カートへ入れる操作が内側に居るためで、ここには入れ子になる操作がありません。
 *
 * 段の中での大きさは器が決めます。この部品は幅を持たず、置かれた枠に従います。
 */
export function ProductTeaser({ item, imagePriority }: ProductTeaserProps) {
  return (
    <Card className="h-full gap-0 overflow-hidden py-0 transition-colors hover:bg-muted/50">
      <Link
        className="flex h-full flex-col rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        href={`/products/${item.id}`}
      >
        <MediaImage
          alt={item.name}
          aspectRatio={MEDIA_IMAGE_ASPECT_RATIO.SQUARE}
          fallbackAlt="画像なし"
          fallbackSrc={NO_IMAGE_URL}
          priority={imagePriority}
          sizes="(min-width: 1024px) 240px, 45vw"
          src={item.imageUrl}
        />
        <div className="flex flex-1 flex-col gap-1 p-3">
          <p className="line-clamp-2 text-sm font-medium break-words">{item.name}</p>
          {/* 通貨は表示の直前で付ける。価格は decimal 文字列のまま持ち回っており、
              数値へ変換するとサブセント精度が落ちる。 */}
          <p className="mt-auto font-medium">${item.price}</p>
        </div>
      </Link>
    </Card>
  );
}
