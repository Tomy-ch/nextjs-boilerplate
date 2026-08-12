import { Badge } from "@/components/design-system/display/badge/badge";
import { Card } from "@/components/design-system/display/card/card";
import { MediaImage } from "@/components/design-system/display/media-image/media-image";
import { NO_IMAGE_URL } from "@/model/media";
import type { ProductListItem } from "@/model/product/product";

/** `ProductCard` の props。 */
export type ProductCardProps = {
  /** 表示する商品。 */
  item: ProductListItem;
  /** 一覧の先頭に並ぶ商品か。LCP 候補として画像を preload する。 */
  leading?: boolean;
};

/**
 * 一覧に並ぶ商品 1 件。
 *
 * @remarks
 * `components` へ上げていないのは、業務型（{@link ProductListItem}）と商品の遷移先に依存する
 * ためです。汎用の `Card` / `Badge` / `MediaImage` を feature の中で合成しています。
 *
 * 分岐は器の幅で行います。同じカードが一覧本体にも脇の狭い領域にも並ぶため、viewport で分けると
 * 置かれた場所によらず同じ形になります（[0051](../../../../../docs/adr/0051-styling-system.md) §2）。
 * 狭い器では画像を上に積み、広い器では横へ並べます。
 *
 * 在庫の表現もここが持ちます。何をもって「残りわずか」とするかはバックエンドの状態遷移に
 * 属し、`components` が供給できるのは `Badge` の variant までです。
 */
export function ProductCard({ item, leading = false }: ProductCardProps) {
  return (
    <Card
      className="@container/card flex h-full flex-col gap-0 overflow-hidden py-0"
      data-testid="product-card"
    >
      <div className="flex flex-col @sm/card:flex-row">
        <MediaImage
          alt={item.name}
          className="@sm/card:w-40 @sm/card:shrink-0"
          fallbackAlt="画像なし"
          fallbackSrc={NO_IMAGE_URL}
          preload={leading}
          sizes="(min-width: 1024px) 160px, 100vw"
          src={item.imageUrl}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
          <p className="font-medium break-words">{item.name}</p>
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
          <div className="mt-auto flex flex-wrap items-baseline justify-between gap-2">
            {/* 通貨は表示の直前で付ける。価格は decimal 文字列のまま持ち回っており、
                数値へ変換するとサブセント精度が落ちる。 */}
            <span className="font-medium">${item.price}</span>
            <span className="text-sm text-muted-foreground">在庫 {item.quantity}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
