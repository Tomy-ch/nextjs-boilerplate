import { Badge } from "@/components/design-system/display/badge/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/design-system/display/card/card";
import { MediaImage } from "@/components/design-system/display/media-image/media-image";
import { NO_IMAGE_URL } from "@/model/media";
import type { Product } from "@/model/product/product";

/** `ProductCard` の props。 */
export type ProductCardProps = {
  /** 表示する商品。 */
  product: Product;
  /** 画像の表示 URL。未設定なら代替画像を出す。 */
  imageUrl: string | null;
  /** 一覧の先頭に並ぶ商品か。LCP 候補として画像を preload する。 */
  leading?: boolean;
};

/**
 * 一覧に並ぶ商品 1 件。
 *
 * @remarks
 * `components` へ上げていないのは、業務型（`Product`）と商品の遷移先に依存するためです。
 * 汎用の `Card` / `Badge` / `MediaImage` を feature の中で合成しています。
 *
 * 在庫の表現もここが持ちます。何をもって「残りわずか」とするかはバックエンドの状態遷移に
 * 属し、`components` が供給できるのは `Badge` の variant までです。
 */
export function ProductCard({ product, imageUrl, leading = false }: ProductCardProps) {
  return (
    <Card className="overflow-hidden" data-testid="product-card">
      <MediaImage
        alt={product.name}
        fallbackAlt="画像なし"
        fallbackSrc={NO_IMAGE_URL}
        preload={leading}
        sizes="(min-width: 768px) 320px, 100vw"
        src={imageUrl}
      />
      <CardHeader>
        <CardTitle>{product.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-2">
        <Badge variant="secondary">{product.category.name}</Badge>
        {product.quantity === 0 ? <Badge variant="destructive">在庫なし</Badge> : null}
      </CardContent>
      <CardFooter className="justify-between">
        {/* 通貨は表示の直前で付ける。価格は decimal 文字列のまま持ち回っており、
            数値へ変換するとサブセント精度が落ちる。 */}
        <span className="font-medium">${product.price}</span>
        <span className="text-sm text-muted-foreground">在庫 {product.quantity}</span>
      </CardFooter>
    </Card>
  );
}
