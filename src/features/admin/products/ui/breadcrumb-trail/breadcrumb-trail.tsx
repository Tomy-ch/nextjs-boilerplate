import Link from "next/link";
import { Fragment } from "react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/design-system/navigation/breadcrumb/breadcrumb";

import { ADMIN_PRODUCT_LIST_PATH } from "../../../paths";

const ROOT_LABEL = "商品一覧管理";

/** `ProductBreadcrumbTrail` の props。 */
export type ProductBreadcrumbTrailProps = {
  /** 一覧より下の現在地。並び順がそのまま階層になる。 */
  trail: readonly string[];
};

/**
 * 商品まわりの画面の、現在地までの階層。
 *
 * @remarks
 * 一覧へ戻る先頭の 1 段はどの画面でも同じなので、ここが持ちます。画面ごとに書くと、呼び名を
 * 変えたときに直し漏れた画面だけが古い呼び名を出します。
 *
 * 一覧より下だけを受け取ります。**戻れるのは一覧までで、途中の段は戻り先を持ちません** ——
 * 編集の途中にある商品名は、それ自体を開く面が管理側に無いためです。
 */
export function ProductBreadcrumbTrail({ trail }: ProductBreadcrumbTrailProps) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href={ADMIN_PRODUCT_LIST_PATH}>{ROOT_LABEL}</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {trail.map((label) => (
          <Fragment key={label}>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{label}</BreadcrumbPage>
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
