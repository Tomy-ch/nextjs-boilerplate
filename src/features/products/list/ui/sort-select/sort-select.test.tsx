// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { FILTER_KEY } from "../../../facade/list-url/list-url";
import type { FilterOption } from "../../query";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

import { ProductSortSelect } from "./sort-select";

const OPTIONS: readonly FilterOption[] = [
  { value: "", label: "新着順" },
  { value: "publishedAt", label: "古い順" },
];

function field(): HTMLElement {
  return screen.getByLabelText("並び替え");
}

describe("ProductSortSelect", () => {
  beforeEach(() => {
    push.mockClear();
  });

  // ----- 正常系 -----
  it("選んだ時点で一覧の URL へ移る", async () => {
    render(<ProductSortSelect options={OPTIONS} selection={{}} />);

    await userEvent.selectOptions(field(), "publishedAt");

    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith("/products?sort=publishedAt");
  });

  it("いま効いている他の条件を引き継ぐ", async () => {
    render(
      <ProductSortSelect
        options={OPTIONS}
        selection={{ [FILTER_KEY.KEYWORD]: "鞄", [FILTER_KEY.CATEGORY]: "c1" }}
      />,
    );

    await userEvent.selectOptions(field(), "publishedAt");

    expect(push).toHaveBeenCalledWith("/products?categoryId=c1&keyword=%E9%9E%84&sort=publishedAt");
  });

  it("いま効いている並びを選択状態にする", () => {
    render(
      <ProductSortSelect options={OPTIONS} selection={{ [FILTER_KEY.SORT]: "publishedAt" }} />,
    );

    expect(field()).toHaveValue("publishedAt");
  });

  it("並びの指定が無ければ既定の並びを選択状態にする", () => {
    render(<ProductSortSelect options={OPTIONS} selection={{}} />);

    expect(field()).toHaveValue("");
  });

  it("読み進めた位置を持ち越さない", async () => {
    render(<ProductSortSelect options={OPTIONS} selection={{ after: "cursor-1", first: "48" }} />);

    await userEvent.selectOptions(field(), "publishedAt");

    expect(push).toHaveBeenCalledWith("/products?sort=publishedAt");
  });

  // ----- 異常系 -----
  it("既定の並びは URL に載せない", async () => {
    render(
      <ProductSortSelect options={OPTIONS} selection={{ [FILTER_KEY.SORT]: "publishedAt" }} />,
    );

    await userEvent.selectOptions(field(), "");

    expect(push).toHaveBeenCalledWith("/products");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<ProductSortSelect options={OPTIONS} selection={{}} />);

    expect((await axe(container)).violations).toEqual([]);
  });
});
