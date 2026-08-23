// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

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

const renderSection = () =>
  render(
    <ProductConfirmSection
      categoryOptions={CATEGORY_OPTIONS}
      imageCount={1}
      statusOptions={STATUS_OPTIONS}
      values={VALUES}
    />,
  );

describe("ProductConfirmSection", () => {
  // この段は届くまでの枠を持たない（理由は `confirm-section.tsx`）。検証はここに 1 つだけ置き、
  // 先頭に保つ（`React.lazy` は解決した値をこの module へ抱え込むため、2 つ目は届く前を掴めない）。
  it("届くまでは何も置かない", () => {
    const { container } = renderSection();

    expect(container).toBeEmptyDOMElement();
  });

  it("受け取った値を中身へそのまま渡す", async () => {
    renderSection();

    expect(await screen.findByText("ワイヤレスイヤホン")).toBeVisible();
  });

  it("a11y 検査を通る", async () => {
    const { container } = renderSection();

    await screen.findByText("ワイヤレスイヤホン");

    expect((await axe(container)).violations).toEqual([]);
  });
});
