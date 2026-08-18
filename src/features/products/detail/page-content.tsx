import { notFound } from "next/navigation";

import { getProduct } from "@/adapters/server/api/products";
import { resolveMediaUrl } from "@/adapters/server/media/media-url";
import { findAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import { toProductId } from "@/model/product/product";

import { ProductDetail } from "./view";

/** `ProductDetailPageContent` の props。 */
export type ProductDetailPageContentProps = {
  /** 表示する商品の ID。route の動的セグメントが渡す。 */
  id: string;
};

/**
 * 商品を取得し、`not-found` だけを Next の境界へ渡す。
 *
 * @remarks
 * 分類ごとの分岐を持つと、画面が増えるたびに同じ分岐が写るため、`not-found` 以外はそのまま投げて
 * `error.tsx` に委ねます（[0080](../../../../docs/adr/0080-error-handling.md)）。
 *
 * try の範囲は取得だけです。**JSX の構築を try に入れても、描画中の例外はここでは捕まりません** —
 * React が描画するのは戻り値を受け取った後だからです。捕まるように見える形にしないため分けています。
 */
async function loadProduct(id: string) {
  try {
    return await getProduct(toProductId(id));
  } catch (error) {
    if (findAppError(error)?.kind === ErrorKind.NOT_FOUND) {
      notFound();
    }

    throw error;
  }
}

/**
 * 商品詳細の中身。取得と組み立てを行う。
 *
 * @remarks
 * 取得と画像 URL の解決をここで行います。理由は [feature の README](../README.md) が持ちます。
 */
export async function ProductDetailPageContent({ id }: ProductDetailPageContentProps) {
  const product = await loadProduct(id);
  const imageUrls = product.imagePaths
    .map((path) => resolveMediaUrl(path))
    .filter((url): url is string => url !== null);

  return <ProductDetail imageUrls={imageUrls} product={product} />;
}
