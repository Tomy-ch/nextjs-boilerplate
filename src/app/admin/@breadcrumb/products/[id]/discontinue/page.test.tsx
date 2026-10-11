// @vitest-environment jsdom

import { describe, expect, it } from "vitest";

import { AdminProductDiscontinueBreadcrumbContent } from "@/features/admin/products/discontinue/breadcrumb-content";
import { toProductId } from "@/model/product/product";

import AdminProductDiscontinueBreadcrumb from "./page";

const ID = "0195f0c2-0000-7000-8000-000000000001";

describe("AdminProductDiscontinueBreadcrumb", () => {
  // ----- 正常系 -----
  it("URL の id を商品の id へ写して、階層を組む側へ渡す", async () => {
    const element = await AdminProductDiscontinueBreadcrumb({
      params: Promise.resolve({ id: ID }),
    });

    expect(element.type).toBe(AdminProductDiscontinueBreadcrumbContent);
    expect(element.props).toEqual({ id: toProductId(ID) });
  });
});
