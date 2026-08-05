// @vitest-environment jsdom

import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { TableViewOptions } from "./table-view-options";
import {
  TABLE_COLUMN_PRIORITY,
  TABLE_COLUMN_PRIORITY_CLASS,
  TABLE_DENSITY,
  TABLE_DENSITY_CLASS,
  TABLE_STICKY_COLUMN_CLASS,
  TABLE_STICKY_ROW_CLASS,
} from "./table-view-options.definition";

beforeAll(() => {
  // Radix の menu は位置計算に使う API を jsdom が持たないため、実装を変えずにここで補う。
  Element.prototype.scrollIntoView = vi.fn();
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

const COLUMNS = [
  { id: "name", label: "プラン名", visible: true, locked: true },
  { id: "status", label: "状態", visible: true },
  { id: "updatedAt", label: "更新日時", visible: false },
];

function openMenu() {
  // Radix の trigger は click ではなく pointerdown で開閉する。
  fireEvent.pointerDown(screen.getByRole("button", { name: "表示設定" }), {
    button: 0,
    ctrlKey: false,
  });

  return screen.getByRole("menu");
}

function renderOptions(overrides: Partial<Parameters<typeof TableViewOptions>[0]> = {}) {
  const props = {
    columns: COLUMNS,
    onColumnVisibilityChange: vi.fn(),
    density: TABLE_DENSITY.COMFORTABLE,
    onDensityChange: vi.fn(),
    ...overrides,
  };
  render(<TableViewOptions {...props} />);

  return props;
}

describe("TableViewOptions", () => {
  it("表の見た目の設定を一つの操作にまとめる", () => {
    renderOptions();

    expect(screen.getByRole("button", { name: "表示設定" })).toBeInTheDocument();
  });

  it("操作の名前を呼び出し元が差し替えられる", () => {
    renderOptions({ label: "一覧の表示" });

    expect(screen.getByRole("button", { name: "一覧の表示" })).toBeInTheDocument();
  });

  it("いま表示している列を checked として並べる", () => {
    renderOptions();

    const menu = openMenu();

    expect(within(menu).getByRole("menuitemcheckbox", { name: "状態" })).toBeChecked();
    expect(within(menu).getByRole("menuitemcheckbox", { name: "更新日時" })).not.toBeChecked();
  });

  it("隠せない列は操作させない", () => {
    renderOptions();

    const menu = openMenu();

    expect(within(menu).getByRole("menuitemcheckbox", { name: "プラン名" })).toHaveAttribute(
      "data-disabled",
    );
  });

  it("列を表示に切り替えたことを呼び出し元へ返す", () => {
    const { onColumnVisibilityChange } = renderOptions();
    const menu = openMenu();

    fireEvent.click(within(menu).getByRole("menuitemcheckbox", { name: "更新日時" }));

    expect(onColumnVisibilityChange).toHaveBeenCalledWith("updatedAt", true);
  });

  it("列を非表示に切り替えたことを呼び出し元へ返す", () => {
    const { onColumnVisibilityChange } = renderOptions();
    const menu = openMenu();

    fireEvent.click(within(menu).getByRole("menuitemcheckbox", { name: "状態" }));

    expect(onColumnVisibilityChange).toHaveBeenCalledWith("status", false);
  });

  it("いまの表示密度を選択済みとして示す", () => {
    renderOptions({ density: TABLE_DENSITY.COMPACT });

    const menu = openMenu();

    expect(within(menu).getByRole("menuitemradio", { name: "詰めて表示" })).toBeChecked();
  });

  it("表示密度を詰める側へ変えたことを呼び出し元へ返す", () => {
    const { onDensityChange } = renderOptions();
    const menu = openMenu();

    fireEvent.click(within(menu).getByRole("menuitemradio", { name: "詰めて表示" }));

    expect(onDensityChange).toHaveBeenCalledWith(TABLE_DENSITY.COMPACT);
  });

  it("表示密度をゆったり側へ戻したことを呼び出し元へ返す", () => {
    const { onDensityChange } = renderOptions({ density: TABLE_DENSITY.COMPACT });
    const menu = openMenu();

    fireEvent.click(within(menu).getByRole("menuitemradio", { name: "ゆったり" }));

    expect(onDensityChange).toHaveBeenCalledWith(TABLE_DENSITY.COMFORTABLE);
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(
      <TableViewOptions
        columns={COLUMNS}
        density={TABLE_DENSITY.COMFORTABLE}
        onColumnVisibilityChange={vi.fn()}
        onDensityChange={vi.fn()}
      />,
    );

    const result = await axe(container, { rules: { "color-contrast": { enabled: false } } });

    expect(result.violations).toEqual([]);
  });
});

describe("表へ適用する class", () => {
  it("詰めるのは高さと上下の余白だけにする", () => {
    expect(TABLE_DENSITY_CLASS[TABLE_DENSITY.COMFORTABLE]).toBe("");
    expect(TABLE_DENSITY_CLASS[TABLE_DENSITY.COMPACT]).toContain("py-1");
    expect(TABLE_DENSITY_CLASS[TABLE_DENSITY.COMPACT]).not.toContain("text-xs");
    expect(TABLE_DENSITY_CLASS[TABLE_DENSITY.COMPACT]).not.toContain("px-");
  });

  it("優先度の低い列ほど広い画面でだけ出す", () => {
    expect(TABLE_COLUMN_PRIORITY_CLASS[TABLE_COLUMN_PRIORITY.ALWAYS]).toBe("");
    expect(TABLE_COLUMN_PRIORITY_CLASS[TABLE_COLUMN_PRIORITY.MEDIUM]).toBe("hidden md:table-cell");
    expect(TABLE_COLUMN_PRIORITY_CLASS[TABLE_COLUMN_PRIORITY.LOW]).toBe("hidden lg:table-cell");
  });

  it("固定列は行の色を引き継ぎ、行が不透明な基準色を持つ", () => {
    expect(TABLE_STICKY_COLUMN_CLASS).toContain("sticky");
    expect(TABLE_STICKY_COLUMN_CLASS).toContain("bg-inherit");
    expect(TABLE_STICKY_ROW_CLASS).toContain("bg-background");
  });
});
