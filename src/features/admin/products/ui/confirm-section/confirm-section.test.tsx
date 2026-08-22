// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";

import type { ProductValues } from "../../use-product-values";
import { ProductConfirmSection } from "./confirm-section";

// 中身は `next/dynamic` で読まれる。先に解決しておかないと、要素を待つ時間の中に module の
// 読み込みが入る（`docs/testing-conventions.md`「`next/dynamic` を含む木を描くとき」）。
beforeAll(async () => {
  await import("./confirm-details");
});

const VALUES: ProductValues = {
  name: "ワイヤレスイヤホン",
  price: "19.99",
  quantity: "12",
  stockWarningThreshold: "3",
  categoryId: "category-1",
  statusId: "status-1",
  publishedAt: "",
  description: "<p>軽い</p>",
};

const CATEGORY_OPTIONS = [{ value: "category-1", label: "電子機器" }];
const STATUS_OPTIONS = [{ value: "status-1", label: "在庫あり" }];

describe("ProductConfirmSection", () => {
  // ----- 正常系 -----
  it("受け取った値を中身へそのまま渡す", async () => {
    render(
      <ProductConfirmSection
        categoryOptions={CATEGORY_OPTIONS}
        imageCount={1}
        statusOptions={STATUS_OPTIONS}
        values={VALUES}
      />,
    );

    expect(await screen.findByText("ワイヤレスイヤホン")).toBeVisible();
  });
});
