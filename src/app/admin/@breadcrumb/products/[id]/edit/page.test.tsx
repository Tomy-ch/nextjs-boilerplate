// @vitest-environment jsdom

import { describe, expect, it } from "vitest";

import { AdminProductEditBreadcrumbContent } from "@/features/admin/products/edit/breadcrumb-content";
import { toProductId } from "@/model/product/product";

import AdminProductEditBreadcrumb from "./page";

const ID = "0195f0c2-0000-7000-8000-000000000001";

describe("AdminProductEditBreadcrumb", () => {
  // ----- 正常系 -----
  it("URL の id を商品の id へ写して、階層を組む側へ渡す", async () => {
    // 階層の中身は組む側のテストが持つ。ここが持つのは、URL から受けた値の渡し方だけ。
    const element = await AdminProductEditBreadcrumb({ params: Promise.resolve({ id: ID }) });

    expect(element.type).toBe(AdminProductEditBreadcrumbContent);
    expect(element.props).toEqual({ id: toProductId(ID) });
  });
});
