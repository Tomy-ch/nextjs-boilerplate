import { ProductBreadcrumbTrail } from "../ui/breadcrumb-trail/breadcrumb-trail";

/** 商品を作る画面の、現在地までの階層。 */
export function AdminProductCreateBreadcrumbContent() {
  return <ProductBreadcrumbTrail trail={["新規作成"]} />;
}
