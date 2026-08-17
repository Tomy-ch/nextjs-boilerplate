// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { FILTER_KEY, type ProductListSelection } from "../../../facade/list-url/list-url";
import type { FilterOption } from "../../query";

const { push, fetchProductCount } = vi.hoisted(() => ({
  push: vi.fn(),
  fetchProductCount: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/adapters/client/api/products", () => ({ fetchProductCount }));

import { ProductFilterDraftProvider } from "../../filter-draft";
import { ProductFilterSidebar } from "./filter-sidebar";

const CATEGORIES: readonly FilterOption[] = [
  { value: "c1", label: "オーディオ" },
  { value: "c2", label: "ウェアラブル" },
];

function renderSidebar(selection: ProductListSelection = {}) {
  return render(
    <ProductFilterDraftProvider selection={selection}>
      <ProductFilterSidebar categories={CATEGORIES} />
    </ProductFilterDraftProvider>,
  );
}

beforeEach(() => {
  push.mockReset();
  fetchProductCount.mockReset();
  fetchProductCount.mockResolvedValue(7);
});

describe("ProductFilterSidebar", () => {
  it("選んだ時点では一覧へ移らない", async () => {
    renderSidebar();

    await userEvent.click(screen.getByLabelText("オーディオ"));

    expect(push).not.toHaveBeenCalled();
  });

  it("確定を押した時点で、組み立てた条件の URL へ移る", async () => {
    renderSidebar();

    await userEvent.click(screen.getByLabelText("オーディオ"));
    await userEvent.click(screen.getByRole("button", { name: "絞り込み" }));

    expect(push).toHaveBeenCalledWith("/products?categoryId=c1");
  });

  it("確定する前の条件で件数を数え、その結果を出す", async () => {
    renderSidebar({ [FILTER_KEY.KEYWORD]: "鞄" });

    expect(await screen.findByText("該当件数 7 件")).toBeInTheDocument();
    expect(fetchProductCount).toHaveBeenCalledTimes(1);
  });

  it("いま効いている条件を入力欄へ映す", () => {
    renderSidebar({ [FILTER_KEY.CATEGORY]: ["c2"] });

    expect(screen.getByLabelText("ウェアラブル")).toBeChecked();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = renderSidebar();

    expect((await axe(container)).violations).toEqual([]);
  });
});
