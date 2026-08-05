// @vitest-environment jsdom

import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { SelectAllCheckbox, SelectionToolbar } from "./selection-toolbar";
import { SELECTION_TOOLBAR_POSITION } from "./selection-toolbar.definition";

describe("SelectAllCheckbox", () => {
  it("すべて選ばれていれば checked になる", () => {
    render(<SelectAllCheckbox onSelectAllChange={vi.fn()} selectedCount={3} totalCount={3} />);

    expect(screen.getByRole("checkbox", { name: "すべて選択" })).toBeChecked();
  });

  it("何も選ばれていなければ unchecked になる", () => {
    render(<SelectAllCheckbox onSelectAllChange={vi.fn()} selectedCount={0} totalCount={3} />);

    expect(screen.getByRole("checkbox", { name: "すべて選択" })).not.toBeChecked();
  });

  it("一部だけ選ばれていれば indeterminate になる", () => {
    render(<SelectAllCheckbox onSelectAllChange={vi.fn()} selectedCount={1} totalCount={3} />);

    expect(screen.getByRole("checkbox", { name: "すべて選択" })).toHaveAttribute(
      "aria-checked",
      "mixed",
    );
  });

  it("一部選択から押すと全選択になる", () => {
    const onSelectAllChange = vi.fn();
    render(
      <SelectAllCheckbox onSelectAllChange={onSelectAllChange} selectedCount={1} totalCount={3} />,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "すべて選択" }));

    expect(onSelectAllChange).toHaveBeenCalledWith(true);
  });

  it("全選択から押すとすべて外す", () => {
    const onSelectAllChange = vi.fn();
    render(
      <SelectAllCheckbox onSelectAllChange={onSelectAllChange} selectedCount={3} totalCount={3} />,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "すべて選択" }));

    expect(onSelectAllChange).toHaveBeenCalledWith(false);
  });

  it("選べる対象が無ければ操作できない", () => {
    render(<SelectAllCheckbox onSelectAllChange={vi.fn()} selectedCount={0} totalCount={0} />);

    expect(screen.getByRole("checkbox", { name: "すべて選択" })).toBeDisabled();
  });

  it("操作の名前を呼び出し元が差し替えられる", () => {
    render(
      <SelectAllCheckbox
        label="この頁の項目をすべて選択"
        onSelectAllChange={vi.fn()}
        selectedCount={0}
        totalCount={3}
      />,
    );

    expect(screen.getByRole("checkbox", { name: "この頁の項目をすべて選択" })).toBeInTheDocument();
  });
});

describe("SelectionToolbar", () => {
  it("選択されていなければ操作を出さない", () => {
    render(
      <SelectionToolbar selectedCount={0}>
        <button type="button">削除</button>
      </SelectionToolbar>,
    );

    expect(screen.queryByRole("button", { name: "削除" })).not.toBeInTheDocument();
  });

  it("選択が始まる前から live region を置く", () => {
    const { container } = render(<SelectionToolbar selectedCount={0} />);

    expect(container.querySelector("[data-slot='selection-toolbar-count']")).toHaveAttribute(
      "aria-live",
      "polite",
    );
  });

  it("選択件数を伝える", () => {
    render(<SelectionToolbar selectedCount={3} />);

    expect(screen.getByText("3 件を選択中")).toBeInTheDocument();
  });

  it("全件数を渡すと母数を添える", () => {
    render(<SelectionToolbar selectedCount={3} totalCount={340} />);

    expect(screen.getByText("全 340 件中 3 件を選択中")).toBeInTheDocument();
  });

  it("件数の単位を呼び出し元が差し替えられる", () => {
    render(<SelectionToolbar selectedCount={3} unit="人" />);

    expect(screen.getByText("3 人を選択中")).toBeInTheDocument();
  });

  it("操作を何件に対するものか分かる名前でまとめる", () => {
    render(
      <SelectionToolbar selectedCount={3}>
        <button type="button">削除</button>
      </SelectionToolbar>,
    );

    const actions = screen.getByRole("group", { name: "選択した 3 件への操作" });

    expect(within(actions).getByRole("button", { name: "削除" })).toBeInTheDocument();
  });

  it("選択の解除を渡すと解除操作を並べる", () => {
    const onClearSelection = vi.fn();
    render(<SelectionToolbar onClearSelection={onClearSelection} selectedCount={3} />);

    fireEvent.click(screen.getByRole("button", { name: "選択を解除" }));

    expect(onClearSelection).toHaveBeenCalledOnce();
  });

  it("選択の解除を渡さなければ解除操作を出さない", () => {
    render(<SelectionToolbar selectedCount={3} />);

    expect(screen.queryByRole("button", { name: "選択を解除" })).not.toBeInTheDocument();
  });

  it("既定では一覧の流れの中に置く", () => {
    const { container } = render(<SelectionToolbar selectedCount={3} />);

    const toolbar = container.querySelector("[data-slot='selection-toolbar']");

    expect(toolbar).toHaveAttribute("data-position", "inline");
    expect(toolbar?.className).toContain("bg-muted");
  });

  it("下端へ固定するときは不透明な背景で重ねる", () => {
    const { container } = render(
      <SelectionToolbar position={SELECTION_TOOLBAR_POSITION.FIXED} selectedCount={3} />,
    );

    const toolbar = container.querySelector("[data-slot='selection-toolbar']");

    expect(toolbar).toHaveAttribute("data-position", "fixed");
    expect(toolbar?.className).toContain("fixed");
    expect(toolbar?.className).toContain("bg-background");
  });

  it("scroll 領域へ貼り付けるときも不透明な背景で重ねる", () => {
    const { container } = render(
      <SelectionToolbar position={SELECTION_TOOLBAR_POSITION.STICKY} selectedCount={3} />,
    );

    expect(container.querySelector("[data-slot='selection-toolbar']")?.className).toContain(
      "sticky",
    );
  });

  it("選択が無ければ位置に関わらず重ならない", () => {
    const { container } = render(
      <SelectionToolbar position={SELECTION_TOOLBAR_POSITION.FIXED} selectedCount={0} />,
    );

    expect(container.querySelector("[data-slot='selection-toolbar']")?.className).not.toContain(
      "fixed",
    );
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(
      <div>
        <SelectAllCheckbox onSelectAllChange={vi.fn()} selectedCount={3} totalCount={340} />
        <SelectionToolbar onClearSelection={vi.fn()} selectedCount={3} totalCount={340}>
          <button type="button">選択した項目を削除</button>
        </SelectionToolbar>
      </div>,
    );

    const result = await axe(container, { rules: { "color-contrast": { enabled: false } } });

    expect(result.violations).toEqual([]);
  });
});
