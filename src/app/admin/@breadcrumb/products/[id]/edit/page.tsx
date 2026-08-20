import Link from "next/link";

import { getProduct } from "@/adapters/server/api/products";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/design-system/navigation/breadcrumb/breadcrumb";
import { ADMIN_PRODUCT_LIST_PATH } from "@/features/admin/paths";
import { toProductId } from "@/model/product/product";

/**
 * 商品を編集する画面の、現在地までの階層。
 *
 * @remarks
 * 商品名を出すために取得します。本文と同じ取得を通るため、同じ描画の中では 1 回にまとまります。
 */
export default async function AdminProductEditBreadcrumb({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProduct(toProductId(id));

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href={ADMIN_PRODUCT_LIST_PATH}>商品一覧管理</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>{product.name}</BreadcrumbPage>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>編集</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
