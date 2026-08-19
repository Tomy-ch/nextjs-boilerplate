// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import type { AdminProductFilterOption } from "../../filter-option";
import { AdminProductFilterControl } from "./filter-control";

beforeAll(() => {
  // 候補を開く overlay が使う表示位置・寸法計測の API を jsdom が持たないため、ここで補う。
  Element.prototype.scrollIntoView = vi.fn();
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

const OPTIONS: readonly AdminProductFilterOption[] = [
  { value: "1", label: "電子機器" },
  { value: "2", label: "書籍" },
];

function renderControl(props: Partial<Parameters<typeof AdminProductFilterControl>[0]> = {}) {
  const onSelect = vi.fn();

  render(
    <AdminProductFilterControl
      label="分類"
      onSelect={onSelect}
      options={OPTIONS}
      value={[]}
      {...props}
    />,
  );

  return { onSelect };
}

/** 候補は開かないと現れない。名前には選択の要約が続くため部分一致で探す。 */
async function open(): Promise<void> {
  await userEvent.click(screen.getByRole("button", { name: /分類/ }));
}

describe("AdminProductFilterControl", () => {
  // ----- 正常系 -----
  it("何で絞り込む欄かを名前で示す", () => {
    renderControl();

    expect(screen.getByRole("button", { name: /分類/ })).toBeInTheDocument();
  });

  it("渡された候補をすべて並べる", async () => {
    renderControl();
    await open();

    expect(screen.getAllByRole("checkbox")).toHaveLength(2);
  });

  it("いま選ばれている値を反映する", async () => {
    renderControl({ value: ["1"] });
    await open();

    expect(screen.getByRole("checkbox", { name: "電子機器" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "書籍" })).not.toBeChecked();
  });

  it("選ばれていなければ、すべてを対象にしていることを示す", () => {
    renderControl();

    expect(screen.getByRole("button", { name: /すべて/ })).toBeInTheDocument();
  });

  it("選び直したことを呼び出し元へ渡す", async () => {
    const { onSelect } = renderControl();
    await open();
    await userEvent.click(screen.getByRole("checkbox", { name: "書籍" }));

    expect(onSelect).toHaveBeenCalledWith(["2"]);
  });

  it("すでに選ばれている条件へ足せる", async () => {
    const { onSelect } = renderControl({ value: ["1"] });
    await open();
    await userEvent.click(screen.getByRole("checkbox", { name: "書籍" }));

    expect(onSelect).toHaveBeenCalledWith(["1", "2"]);
  });

  it("選ばれている条件を外せる", async () => {
    const { onSelect } = renderControl({ value: ["1", "2"] });
    await open();
    await userEvent.click(screen.getByRole("checkbox", { name: "電子機器" }));

    expect(onSelect).toHaveBeenCalledWith(["2"]);
  });

  it("選ばれた値を自分では扱わない", async () => {
    const { onSelect } = renderControl();
    await open();
    await userEvent.click(screen.getByRole("checkbox", { name: "書籍" }));

    expect(screen.getByRole("checkbox", { name: "書籍" })).not.toBeChecked();
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("外側の並び方を class 名で受け取る", () => {
    const { container } = render(
      <AdminProductFilterControl
        className="justify-between"
        label="分類"
        onSelect={vi.fn()}
        options={OPTIONS}
        value={[]}
      />,
    );

    expect(container.firstElementChild).toHaveClass("justify-between");
  });

  // ----- 異常系 -----
  it("候補が無くても落ちない", async () => {
    renderControl({ options: [] });
    await open();

    expect(screen.queryAllByRole("checkbox")).toEqual([]);
  });

  it("a11y 検査を通る", async () => {
    const { container } = render(
      <AdminProductFilterControl label="分類" onSelect={vi.fn()} options={OPTIONS} value={["1"]} />,
    );

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
