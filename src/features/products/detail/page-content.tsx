import { notFound } from "next/navigation";

import { getProduct } from "@/adapters/server/api/products";
import { resolveMediaUrl } from "@/adapters/server/media/media-url";
import { findAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";

import { ProductDetail } from "./view";

/** `ProductDetailPageContent` の props。 */
export type ProductDetailPageContentProps = {
  /** 表示する商品の ID。route の動的セグメントが渡す。 */
  id: string;
};

/**
 * 商品詳細の中身。取得と組み立てを行う。
 *
 * @remarks
 * 取得を page ではなくここで行うのは、`adapters` を呼べるのが feature までであり、page は feature を
 * 薄く呼ぶだけの層だからです（[0021](../../../../docs/adr/0021-frontend-responsibility.md)）。画像 URL の
 * 解決も同じ理由でここに置きます。設定を読めるのは `adapters` までです。
 *
 * 分類のうち `not-found` だけを Next の境界へ渡し、残りはそのまま投げて `error.tsx` に委ねます。
 * 分類ごとの分岐を持つと、画面が増えるたびに同じ分岐が写ります
 * （[0080](../../../../docs/adr/0080-error-handling.md)）。
 */
export async function ProductDetailPageContent({ id }: ProductDetailPageContentProps) {
  try {
    const product = await getProduct(id);
    const imageUrls = product.imagePaths
      .map((path) => resolveMediaUrl(path))
      .filter((url): url is string => url !== null);

    return <ProductDetail imageUrls={imageUrls} product={product} />;
  } catch (error) {
    if (findAppError(error)?.kind === ErrorKind.NOT_FOUND) {
      notFound();
    }

    throw error;
  }
}
