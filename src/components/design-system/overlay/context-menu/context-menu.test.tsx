// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuPortal,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "./context-menu";
import { CONTEXT_MENU_ITEM_VARIANT } from "./context-menu.definition";

beforeAll(() => {
  // Radix の menu は位置計算に使う API を jsdom が持たないため、実装を変えずにここで補う。
  Element.prototype.scrollIntoView = vi.fn();
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

function ActionMenuFixture({ onSelect }: { onSelect?: () => void }) {
  return (
    <ContextMenu>
      <ContextMenuTrigger>対象の行</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuLabel>この行の操作</ContextMenuLabel>
        <ContextMenuGroup>
          <ContextMenuItem onSelect={onSelect}>
            詳細を見る
            <ContextMenuShortcut>⇧D</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem disabled>公開する</ContextMenuItem>
        </ContextMenuGroup>
        <ContextMenuSeparator />
        <ContextMenuItem inset variant={CONTEXT_MENU_ITEM_VARIANT.DESTRUCTIVE}>
          削除する
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function SelectionMenuFixture() {
  const [showDetail, setShowDetail] = useState(false);
  const [density, setDensity] = useState("comfortable");

  return (
    <ContextMenu>
      <ContextMenuTrigger>表示設定</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuCheckboxItem checked={showDetail} onCheckedChange={setShowDetail}>
          詳細を表示
        </ContextMenuCheckboxItem>
        <ContextMenuLabel inset>表示密度</ContextMenuLabel>
        <ContextMenuRadioGroup onValueChange={setDensity} value={density}>
          <ContextMenuRadioItem value="comfortable">標準</ContextMenuRadioItem>
          <ContextMenuRadioItem value="compact">高密度</ContextMenuRadioItem>
        </ContextMenuRadioGroup>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function SubMenuFixture() {
  return (
    <ContextMenu>
      <ContextMenuTrigger>入れ子</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuSub>
          <ContextMenuSubTrigger inset>移動先を選ぶ</ContextMenuSubTrigger>
          <ContextMenuPortal>
            <ContextMenuSubContent>
              <ContextMenuItem>上の階層へ</ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuPortal>
        </ContextMenuSub>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function openMenu(name: string): void {
  fireEvent.contextMenu(screen.getByText(name));
}

describe("ContextMenu", () => {
  it("右クリックするまで menu を描画しない", () => {
    render(<ActionMenuFixture />);

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("対象領域の contextmenu で menu と項目を開く", () => {
    render(<ActionMenuFixture />);

    openMenu("対象の行");

    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /詳細を見る/ })).toBeInTheDocument();
    expect(screen.getByText("この行の操作")).toBeInTheDocument();
  });

  it("項目を選ぶと操作を実行して menu を閉じる", () => {
    const handleSelect = vi.fn();
    render(<ActionMenuFixture onSelect={handleSelect} />);
    openMenu("対象の行");

    fireEvent.click(screen.getByRole("menuitem", { name: /詳細を見る/ }));

    expect(handleSelect).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("disabled の項目は操作を実行しない", () => {
    render(<ActionMenuFixture />);
    openMenu("対象の行");

    const item = screen.getByRole("menuitem", { name: "公開する" });
    expect(item).toHaveAttribute("data-disabled");
  });

  it("Escape で閉じる", () => {
    render(<ActionMenuFixture />);
    openMenu("対象の行");

    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("shortcut は表示だけを担い、その打鍵では操作を実行しない", () => {
    const handleSelect = vi.fn();
    render(<ActionMenuFixture onSelect={handleSelect} />);
    openMenu("対象の行");

    expect(screen.getByRole("menuitem", { name: /詳細を見る/ })).toHaveTextContent("⇧D");

    fireEvent.keyDown(screen.getByRole("menu"), { key: "D", shiftKey: true });

    expect(handleSelect).not.toHaveBeenCalled();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { baseElement } = render(<ActionMenuFixture />);
    openMenu("対象の行");

    expect(
      (
        await axe(baseElement, {
          rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
        })
      ).violations,
    ).toEqual([]);
  });
});

describe("ContextMenu の選択状態", () => {
  it("checkbox 項目は選択状態を読み上げ、選ぶと切り替わる", () => {
    render(<SelectionMenuFixture />);
    openMenu("表示設定");

    const item = screen.getByRole("menuitemcheckbox", { name: "詳細を表示" });
    expect(item).toHaveAttribute("aria-checked", "false");

    fireEvent.click(item);
    openMenu("表示設定");
    expect(screen.getByRole("menuitemcheckbox", { name: "詳細を表示" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("radio 項目は群の値と一致するものが選択状態になる", () => {
    render(<SelectionMenuFixture />);
    openMenu("表示設定");

    expect(screen.getByRole("menuitemradio", { name: "標準" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("menuitemradio", { name: "高密度" })).toHaveAttribute(
      "aria-checked",
      "false",
    );

    fireEvent.click(screen.getByRole("menuitemradio", { name: "高密度" }));
    openMenu("表示設定");
    expect(screen.getByRole("menuitemradio", { name: "高密度" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });
});

describe("ContextMenu の入れ子", () => {
  it("入れ子の trigger を選ぶと下位の menu を開く", () => {
    render(<SubMenuFixture />);
    openMenu("入れ子");

    const subTrigger = screen.getByRole("menuitem", { name: "移動先を選ぶ" });
    expect(subTrigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(subTrigger);

    expect(screen.getByRole("menuitem", { name: "上の階層へ" })).toBeInTheDocument();
  });
});
