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

import { ProductFilterSheet } from "./filter-sheet";

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

function trigger(): HTMLElement {
  return screen.getByRole("button", { name: /^絞り込み/ });
}

async function open(): Promise<void> {
  await userEvent.click(trigger());
  await screen.findByRole("dialog", { name: "絞り込み" });
}

function group(legend: string) {
  return within(screen.getByRole("group", { name: legend }));
}

describe("ProductFilterSheet", () => {
  beforeEach(() => {
    push.mockClear();
  });

  // ----- 正常系 -----
  it("開くまで条件の入力欄を出さない", () => {
    render(<ProductFilterSheet groups={GROUPS} selection={{}} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger()).toBeVisible();
  });

  it("開く操作で条件の入力欄を出す", async () => {
    render(<ProductFilterSheet groups={GROUPS} selection={{}} />);

    await open();

    expect(group("カテゴリ").getByLabelText("オーディオ")).toBeVisible();
    expect(group("状態").getByLabelText("在庫切れ")).toBeVisible();
  });

  it("選んだだけでは一覧へ反映しない", async () => {
    render(<ProductFilterSheet groups={GROUPS} selection={{}} />);
    await open();

    await userEvent.click(group("カテゴリ").getByLabelText("オーディオ"));

    expect(push).not.toHaveBeenCalled();
    expect(group("カテゴリ").getByLabelText("オーディオ")).toBeChecked();
  });

  it("確定して初めて選んだ条件で一覧へ移る", async () => {
    render(<ProductFilterSheet groups={GROUPS} selection={{}} />);
    await open();
    await userEvent.click(group("カテゴリ").getByLabelText("オーディオ"));

    await userEvent.click(screen.getByRole("button", { name: "この条件で見る" }));

    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith("/products?categoryId=c1");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("確定した URL に他の条件を引き継ぎ、読み進めた位置を落とす", async () => {
    render(
      <ProductFilterSheet
        groups={GROUPS}
        selection={{ [FILTER_KEY.KEYWORD]: "鞄", after: "cursor-1", first: "48" }}
      />,
    );
    await open();
    await userEvent.click(group("状態").getByLabelText("在庫切れ"));

    await userEvent.click(screen.getByRole("button", { name: "この条件で見る" }));

    expect(push).toHaveBeenCalledWith("/products?keyword=%E9%9E%84&statusId=s2");
  });

  it("効いている条件の数を開く操作に付ける", () => {
    render(
      <ProductFilterSheet
        groups={GROUPS}
        selection={{ [FILTER_KEY.CATEGORY]: "c1", [FILTER_KEY.STATUS]: "s2" }}
      />,
    );

    expect(trigger()).toHaveAccessibleName(expect.stringContaining("2 件の条件が有効"));
  });

  // ----- 異常系 -----
  it("効いている条件が無いときは数を付けない", () => {
    render(<ProductFilterSheet groups={GROUPS} selection={{ after: "cursor-1" }} />);

    expect(trigger()).toHaveAccessibleName("絞り込み");
  });

  it("確定せずに閉じた選択は、開き直すと URL の状態へ戻る", async () => {
    render(<ProductFilterSheet groups={GROUPS} selection={{ [FILTER_KEY.CATEGORY]: "c1" }} />);
    await open();
    await userEvent.click(group("カテゴリ").getByLabelText("ウェアラブル"));
    await userEvent.click(screen.getByRole("button", { name: "閉じる" }));

    await open();

    expect(group("カテゴリ").getByLabelText("オーディオ")).toBeChecked();
    expect(group("カテゴリ").getByLabelText("ウェアラブル")).not.toBeChecked();
    expect(push).not.toHaveBeenCalled();
  });

  it("条件をすべて外すと、どの群も「すべて」に戻る", async () => {
    render(
      <ProductFilterSheet
        groups={GROUPS}
        selection={{ [FILTER_KEY.CATEGORY]: "c1", [FILTER_KEY.STATUS]: "s2" }}
      />,
    );
    await open();

    await userEvent.click(screen.getByRole("button", { name: "条件をすべて外す" }));

    expect(group("カテゴリ").getByLabelText("すべて")).toBeChecked();
    expect(group("状態").getByLabelText("すべて")).toBeChecked();
  });

  it("条件をすべて外して確定すると、絞り込み以外の条件だけが残る", async () => {
    render(
      <ProductFilterSheet
        groups={GROUPS}
        selection={{
          [FILTER_KEY.CATEGORY]: "c1",
          [FILTER_KEY.STATUS]: "s2",
          [FILTER_KEY.KEYWORD]: "鞄",
        }}
      />,
    );
    await open();
    await userEvent.click(screen.getByRole("button", { name: "条件をすべて外す" }));

    await userEvent.click(screen.getByRole("button", { name: "この条件で見る" }));

    expect(push).toHaveBeenCalledWith("/products?keyword=%E9%9E%84");
  });

  it("開いた状態が a11y 自動検査に違反しない", async () => {
    const { baseElement } = render(
      <ProductFilterSheet groups={GROUPS} selection={{ [FILTER_KEY.CATEGORY]: "c1" }} />,
    );
    await open();

    const result = await axe(baseElement, { rules: { "color-contrast": { enabled: false } } });

    expect(result.violations).toEqual([]);
  });
});
