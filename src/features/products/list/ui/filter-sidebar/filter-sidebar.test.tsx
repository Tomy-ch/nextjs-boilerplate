// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { FILTER_KEY } from "../../query";
import type { FilterGroup } from "../filter-fields/filter-fields";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

import { ProductFilterSidebar } from "./filter-sidebar";

const GROUPS: readonly FilterGroup[] = [
  {
    key: FILTER_KEY.CATEGORY,
    legend: "カテゴリ",
    options: [
      { value: "", label: "すべて" },
      { value: "c1", label: "オーディオ" },
      { value: "c2", label: "ウェアラブル" },
    ],
  },
  {
    key: FILTER_KEY.STATUS,
    legend: "状態",
    options: [
      { value: "", label: "すべて" },
      { value: "s1", label: "公開" },
      { value: "s2", label: "在庫切れ" },
    ],
  },
];

function group(legend: string) {
  return within(screen.getByRole("group", { name: legend }));
}

describe("ProductFilterSidebar", () => {
  beforeEach(() => {
    push.mockClear();
  });

  // ----- 正常系 -----
  it("選んだ時点で一覧の URL へ移る", async () => {
    render(<ProductFilterSidebar groups={GROUPS} selection={{}} />);

    await userEvent.click(group("カテゴリ").getByLabelText("オーディオ"));

    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith("/products?categoryId=c1");
  });

  it("いま効いている他の条件を引き継ぐ", async () => {
    render(
      <ProductFilterSidebar
        groups={GROUPS}
        selection={{ [FILTER_KEY.KEYWORD]: "鞄", [FILTER_KEY.SORT]: "publishedAt" }}
      />,
    );

    await userEvent.click(group("状態").getByLabelText("在庫切れ"));

    expect(push).toHaveBeenCalledWith("/products?keyword=%E9%9E%84&sort=publishedAt&statusId=s2");
  });

  it("効いている条件を選択済みとして出す", () => {
    render(<ProductFilterSidebar groups={GROUPS} selection={{ [FILTER_KEY.CATEGORY]: "c2" }} />);

    expect(group("カテゴリ").getByLabelText("ウェアラブル")).toBeChecked();
  });

  it("絞り込みの領域として名前を持つ", () => {
    render(<ProductFilterSidebar groups={GROUPS} selection={{}} />);

    expect(screen.getByRole("region", { name: "絞り込み" })).toBeVisible();
  });

  it("読み進めた位置を持ち越さない", async () => {
    render(
      <ProductFilterSidebar
        groups={GROUPS}
        selection={{ after: "cursor-1", first: "48", [FILTER_KEY.CATEGORY]: "c1" }}
      />,
    );

    await userEvent.click(group("カテゴリ").getByLabelText("ウェアラブル"));

    expect(push).toHaveBeenCalledWith("/products?categoryId=c2");
  });

  // ----- 異常系 -----
  it("「すべて」を選ぶとその条件を URL から外す", async () => {
    render(<ProductFilterSidebar groups={GROUPS} selection={{ [FILTER_KEY.CATEGORY]: "c1" }} />);

    await userEvent.click(group("カテゴリ").getByLabelText("すべて"));

    expect(push).toHaveBeenCalledWith("/products");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(
      <ProductFilterSidebar groups={GROUPS} selection={{ [FILTER_KEY.CATEGORY]: "c1" }} />,
    );

    expect((await axe(container)).violations).toEqual([]);
  });
});
