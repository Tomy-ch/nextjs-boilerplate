// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { Kbd } from "../../display/kbd/kbd";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { DROPDOWN_MENU_ITEM_VARIANT } from "./dropdown-menu.definition";

beforeAll(() => {
  // Radix の menu は位置計算に使う API を jsdom が持たないため、実装を変えずにここで補う。
  Element.prototype.scrollIntoView = vi.fn();
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

function preventClose(event: Event) {
  event.preventDefault();
}

function ActionMenuFixture({ onSelect }: { onSelect?: () => void }) {
  return (
    <DropdownMenu defaultOpen>
      <DropdownMenuTrigger>操作</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>この行の操作</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={onSelect}>
            詳細を見る
            <DropdownMenuShortcut>
              <Kbd>⇧</Kbd>
              <Kbd>D</Kbd>
            </DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem disabled>公開する</DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant={DROPDOWN_MENU_ITEM_VARIANT.DESTRUCTIVE}>
          削除する
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

describe("DropdownMenu", () => {
  it("開くまで項目を表示しない", () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>操作</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>詳細を見る</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "操作" })).toHaveAttribute("aria-expanded", "false");
  });

  it("開くと menu と menuitem の意味論を提供する", () => {
    render(<ActionMenuFixture />);

    expect(screen.getByRole("menu")).toHaveAttribute("data-slot", "dropdown-menu-content");
    expect(screen.getByRole("menuitem", { name: /詳細を見る/ })).toBeInTheDocument();
    expect(screen.getByRole("separator")).toHaveAttribute("data-slot", "dropdown-menu-separator");
  });

  it("shortcut 表示を kbd の意味論で提供する", () => {
    render(<ActionMenuFixture />);

    const shortcut = document.querySelector("[data-slot='dropdown-menu-shortcut']");

    expect(shortcut?.tagName).toBe("KBD");
    expect(shortcut?.querySelectorAll("[data-slot='kbd']")).toHaveLength(2);
    expect(shortcut).toHaveTextContent("⇧D");
  });

  it("項目を選ぶと操作を実行して menu を閉じる", () => {
    const onSelect = vi.fn();
    render(<ActionMenuFixture onSelect={onSelect} />);

    fireEvent.click(screen.getByRole("menuitem", { name: /詳細を見る/ }));

    expect(onSelect).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("disabled な項目は操作できない", () => {
    render(<ActionMenuFixture />);

    expect(screen.getByRole("menuitem", { name: "公開する" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("破壊的な項目を variant で区別する", () => {
    render(<ActionMenuFixture />);

    expect(screen.getByRole("menuitem", { name: "削除する" })).toHaveAttribute(
      "data-variant",
      DROPDOWN_MENU_ITEM_VARIANT.DESTRUCTIVE,
    );
  });

  it("Escape で閉じる", () => {
    render(<ActionMenuFixture />);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("checkbox 項目と radio 項目が選択状態を読み上げ可能にする", () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>表示設定</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuCheckboxItem checked>名称</DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked={false}>更新日時</DropdownMenuCheckboxItem>
          <DropdownMenuRadioGroup value="comfortable">
            <DropdownMenuRadioItem value="comfortable">標準</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="compact">高密度</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    expect(screen.getByRole("menuitemcheckbox", { name: "名称" })).toBeChecked();
    expect(screen.getByRole("menuitemcheckbox", { name: "更新日時" })).not.toBeChecked();
    expect(screen.getByRole("menuitemradio", { name: "標準" })).toBeChecked();
    expect(screen.getByRole("menuitemradio", { name: "高密度" })).not.toBeChecked();
  });

  it("checkbox 項目を選ぶと既定では menu が閉じる", () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>表示設定</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuCheckboxItem checked={false}>名称</DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "名称" }));

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("onSelect で既定動作を止めると、続けて切り替えても menu が開いたままになる", () => {
    const onCheckedChange = vi.fn();
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>表示設定</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuCheckboxItem
            checked={false}
            onCheckedChange={onCheckedChange}
            onSelect={preventClose}
          >
            名称
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked={false} onSelect={preventClose}>
            更新日時
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "名称" }));
    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "更新日時" }));

    expect(onCheckedChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("入れ子の menu を trigger の開閉状態とともに提供する", () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>共有</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>権限を変更</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem>閲覧のみ</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    const subTrigger = screen.getByRole("menuitem", { name: "権限を変更" });

    expect(subTrigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.keyDown(subTrigger, { key: "ArrowRight" });

    expect(screen.getByRole("menuitem", { name: "閲覧のみ" })).toBeInTheDocument();
  });

  it("DropdownMenuPortal で描画先を明示できる", () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>操作</DropdownMenuTrigger>
        <DropdownMenuPortal data-testid="portal">
          <DropdownMenuContent>
            <DropdownMenuItem>詳細を見る</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenu>,
    );

    expect(screen.getByRole("menuitem", { name: "詳細を見る" })).toBeInTheDocument();
  });

  it("開いた状態で WCAG AA 相当の a11y 自動検査に違反しない", async () => {
    const { baseElement } = render(<ActionMenuFixture />);

    const result = await axe(baseElement, {
      rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
    });

    expect(result.violations).toEqual([]);
  });
});
