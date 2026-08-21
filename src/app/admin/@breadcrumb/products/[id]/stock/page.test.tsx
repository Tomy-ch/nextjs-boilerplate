// @vitest-environment jsdom

import { describe, expect, it } from "vitest";

import { AdminProductStockBreadcrumbContent } from "@/features/admin/products/stock/breadcrumb-content";
import { toProductId } from "@/model/product/product";

import AdminProductStockBreadcrumb from "./page";

const ID = "0195f0c2-0000-7000-8000-000000000001";

describe("AdminProductStockBreadcrumb", () => {
  // ----- 正常系 -----
  it("URL の id を商品の id へ写して、階層を組む側へ渡す", async () => {
    // 階層の中身は組む側のテストが持つ。ここが持つのは、URL から受けた値の渡し方だけ。
    const element = await AdminProductStockBreadcrumb({ params: Promise.resolve({ id: ID }) });

    expect(element.type).toBe(AdminProductStockBreadcrumbContent);
    expect(element.props).toEqual({ id: toProductId(ID) });
  });
});
