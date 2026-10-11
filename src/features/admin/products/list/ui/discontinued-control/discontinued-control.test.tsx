// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { DISCONTINUED_FILTER, type DiscontinuedFilter } from "../../query";
import { AdminProductDiscontinuedControl } from "./discontinued-control";

function renderControl(value: DiscontinuedFilter | null = null, onSelect = vi.fn()) {
  return {
    ...render(<AdminProductDiscontinuedControl onSelect={onSelect} value={value} />),
    onSelect,
  };
}

describe("AdminProductDiscontinuedControl", () => {
  it("廃番の呼び名でまとめた 2 つの選択肢を出す", () => {
    renderControl();

    const group = screen.getByRole("group", { name: "廃番" });

    const radios = within(group).getAllByRole("radio");

    expect(radios).toHaveLength(2);
    expect(radios[0]).toHaveAccessibleName("廃番のみ");
    expect(radios[1]).toHaveAccessibleName("廃番を除く");
  });

  it("絞り込んでいなければ、どちらも選ばれていない", () => {
    renderControl(null);

    expect(screen.getByRole("radio", { name: "廃番のみ" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "廃番を除く" })).not.toBeChecked();
  });

  it("いまの値に当たる選択肢だけを選ばれた状態にする", () => {
    renderControl(DISCONTINUED_FILTER.EXCLUDED);

    expect(screen.getByRole("radio", { name: "廃番を除く" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "廃番のみ" })).not.toBeChecked();
  });

  it("「廃番を除く」を選ぶと、契約の綴り false で呼び出し元へ伝える", async () => {
    const { onSelect } = renderControl();

    await userEvent.click(screen.getByRole("radio", { name: "廃番を除く" }));

    expect(onSelect).toHaveBeenCalledWith("false");
  });

  it("「廃番のみ」を選ぶと、契約の綴り true で呼び出し元へ伝える", async () => {
    const { onSelect } = renderControl();

    await userEvent.click(screen.getByRole("radio", { name: "廃番のみ" }));

    expect(onSelect).toHaveBeenCalledWith("true");
  });

  it("2 か所に置いても、同じ値をそれぞれが選ばれた状態で保つ", () => {
    render(
      <>
        <AdminProductDiscontinuedControl onSelect={vi.fn()} value={DISCONTINUED_FILTER.ONLY} />
        <AdminProductDiscontinuedControl onSelect={vi.fn()} value={DISCONTINUED_FILTER.ONLY} />
      </>,
    );

    const [first, second] = screen.getAllByRole("group", { name: "廃番" });

    if (first === undefined || second === undefined) {
      throw new Error("選択欄が 2 か所に描かれていない");
    }

    expect(within(first).getByRole("radio", { name: "廃番のみ" })).toBeChecked();
    expect(within(second).getByRole("radio", { name: "廃番のみ" })).toBeChecked();
  });

  it("a11y 検査を通る", async () => {
    const { container } = renderControl(DISCONTINUED_FILTER.ONLY);

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
