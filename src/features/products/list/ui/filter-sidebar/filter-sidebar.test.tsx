// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { FILTER_KEY, type ProductListSelection } from "../../../facade/list-url/list-url";
import type { FilterOption } from "../../query";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

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
});

describe("ProductFilterSidebar", () => {
  it("選んだ時点で、その条件の URL へ移る", async () => {
    renderSidebar();

    await userEvent.click(screen.getByLabelText("オーディオ"));

    expect(push).toHaveBeenCalledWith("/products?categoryId=c1");
  });

  it("確定の操作を置かない", () => {
    renderSidebar();

    expect(screen.queryByRole("button", { name: "絞り込み" })).not.toBeInTheDocument();
  });

  it("キーワードなど、入力欄が受け持たない条件は落とさずに反映する", async () => {
    renderSidebar({ [FILTER_KEY.KEYWORD]: "鞄" });

    await userEvent.click(screen.getByLabelText("オーディオ"));

    expect(push).toHaveBeenCalledWith("/products?categoryId=c1&keyword=%E9%9E%84");
  });

  it("いま効いている条件を入力欄へ映す", () => {
    renderSidebar({ [FILTER_KEY.CATEGORY]: ["c2"] });

    expect(screen.getByLabelText("ウェアラブル")).toBeChecked();
  });

  it("反映を待っている間も入力欄を押せる", async () => {
    renderSidebar();

    await userEvent.click(screen.getByLabelText("オーディオ"));

    expect(screen.getByLabelText("ウェアラブル")).toBeEnabled();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = renderSidebar();

    expect((await axe(container)).violations).toEqual([]);
  });
});
