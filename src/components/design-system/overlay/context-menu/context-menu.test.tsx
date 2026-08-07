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

describe("ContextMenuCheckboxItem", () => {
  // ----- 正常系 -----
  it("選択状態を読み上げ、選ぶと切り替わる", () => {
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
});

describe("ContextMenuRadioItem", () => {
  // ----- 正常系 -----
  it("群の値と一致するものが選択状態になる", () => {
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

describe("ContextMenuSubContent", () => {
  // ----- 正常系 -----
  it("入れ子の trigger を選ぶと下位の menu を描画する", () => {
    render(<SubMenuFixture />);
    openMenu("入れ子");

    const subTrigger = screen.getByRole("menuitem", { name: "移動先を選ぶ" });
    expect(subTrigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(subTrigger);

    expect(screen.getByRole("menuitem", { name: "上の階層へ" })).toBeInTheDocument();
  });
});

describe("ContextMenuTrigger", () => {
  // ----- 正常系 -----
  it("右クリックで menu を開く", () => {
    render(<ActionMenuFixture />);
    openMenu("対象の行");

    expect(screen.getByRole("menu")).toBeInTheDocument();
  });
});

describe("ContextMenuPortal", () => {
  // ----- 正常系 -----
  it("内容を呼び出し位置の外へ描画する", () => {
    const { container } = render(<ActionMenuFixture />);
    openMenu("対象の行");

    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(container.querySelector('[data-slot="context-menu-content"]')).toBeNull();
  });
});

describe("ContextMenuContent", () => {
  // ----- 正常系 -----
  it("menu の意味論と slot を持つ要素を描画する", () => {
    render(<ActionMenuFixture />);
    openMenu("対象の行");

    expect(screen.getByRole("menu")).toHaveAttribute("data-slot", "context-menu-content");
  });
});

describe("ContextMenuGroup", () => {
  // ----- 正常系 -----
  it("項目の束として slot を持つ要素を描画する", () => {
    render(<ActionMenuFixture />);
    openMenu("対象の行");

    expect(document.querySelector('[data-slot="context-menu-group"]')).not.toBeNull();
  });
});

describe("ContextMenuLabel", () => {
  // ----- 正常系 -----
  it("見出しとして slot を持つ要素を描画する", () => {
    render(<ActionMenuFixture />);
    openMenu("対象の行");

    expect(screen.getByText("この行の操作")).toHaveAttribute("data-slot", "context-menu-label");
  });
});

describe("ContextMenuItem", () => {
  // ----- 正常系 -----
  it("menuitem として slot を持つ要素を描画する", () => {
    render(<ActionMenuFixture />);
    openMenu("対象の行");

    expect(screen.getByRole("menuitem", { name: /詳細を見る/ })).toHaveAttribute(
      "data-slot",
      "context-menu-item",
    );
  });

  // ----- 異常系 -----
  it("disabled な項目を操作できないものとして示す", () => {
    render(<ActionMenuFixture />);
    openMenu("対象の行");

    expect(screen.getByRole("menuitem", { name: "公開する" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });
});

describe("ContextMenuSeparator", () => {
  // ----- 正常系 -----
  it("区切りとして separator の意味論を持つ要素を描画する", () => {
    render(<ActionMenuFixture />);
    openMenu("対象の行");

    expect(screen.getByRole("separator")).toHaveAttribute("data-slot", "context-menu-separator");
  });
});

describe("ContextMenuShortcut", () => {
  // ----- 正常系 -----
  it("shortcut 表示として slot を持つ要素を描画する", () => {
    render(<ActionMenuFixture />);
    openMenu("対象の行");

    expect(document.querySelector('[data-slot="context-menu-shortcut"]')).toHaveTextContent("⇧D");
  });
});

describe("ContextMenuRadioGroup", () => {
  // ----- 正常系 -----
  it("排他選択の束として slot を持つ要素を描画する", () => {
    render(<SelectionMenuFixture />);
    openMenu("表示設定");

    expect(document.querySelector('[data-slot="context-menu-radio-group"]')).not.toBeNull();
  });
});

describe("ContextMenuSub", () => {
  // ----- 正常系 -----
  it("入れ子の menu を閉じた状態で用意する", () => {
    render(<SubMenuFixture />);
    openMenu("入れ子");

    expect(screen.getByRole("menuitem", { name: "移動先を選ぶ" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });
});

describe("ContextMenuSubTrigger", () => {
  // ----- 正常系 -----
  it("開く操作として slot を持つ要素を描画する", () => {
    render(<SubMenuFixture />);
    openMenu("入れ子");

    expect(screen.getByRole("menuitem", { name: "移動先を選ぶ" })).toHaveAttribute(
      "data-slot",
      "context-menu-sub-trigger",
    );
  });
});
