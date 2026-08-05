// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { Kbd } from "../../display/kbd/kbd";
import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarGroup,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "./menubar";
import { MENUBAR_ITEM_VARIANT } from "./menubar.definition";

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

function EditorMenubarFixture({
  defaultValue,
  onSelect,
}: {
  defaultValue?: string;
  onSelect?: () => void;
}) {
  return (
    <Menubar aria-label="編集操作" defaultValue={defaultValue}>
      <MenubarMenu value="file">
        <MenubarTrigger>ファイル</MenubarTrigger>
        <MenubarContent>
          <MenubarLabel>この文書の操作</MenubarLabel>
          <MenubarGroup>
            <MenubarItem onSelect={onSelect}>
              新規作成
              <MenubarShortcut>
                <Kbd>⌘</Kbd>
                <Kbd>N</Kbd>
              </MenubarShortcut>
            </MenubarItem>
            <MenubarItem disabled>取り込む</MenubarItem>
          </MenubarGroup>
          <MenubarSeparator />
          <MenubarItem variant={MENUBAR_ITEM_VARIANT.DESTRUCTIVE}>削除する</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu value="edit">
        <MenubarTrigger>編集</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>元に戻す</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );
}

describe("Menubar", () => {
  it("常に見えている trigger を menubar の意味論で並べる", () => {
    render(<EditorMenubarFixture />);

    const menubar = screen.getByRole("menubar", { name: "編集操作" });

    expect(menubar).toHaveAttribute("data-slot", "menubar");
    expect(screen.getByRole("menuitem", { name: "ファイル" })).toHaveAttribute(
      "aria-haspopup",
      "menu",
    );
  });

  it("開くまで項目を表示しない", () => {
    render(<EditorMenubarFixture />);

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "ファイル" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("trigger を押すと対応する menu を開く", () => {
    render(<EditorMenubarFixture />);

    fireEvent.pointerDown(screen.getByRole("menuitem", { name: "ファイル" }), { button: 0 });

    expect(screen.getByRole("menu")).toHaveAttribute("data-slot", "menubar-content");
    expect(screen.getByRole("menuitem", { name: "ファイル" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("開いた menu が項目と区切りの意味論を提供する", () => {
    render(<EditorMenubarFixture defaultValue="file" />);

    expect(screen.getByRole("menuitem", { name: /新規作成/ })).toBeInTheDocument();
    expect(screen.getByRole("separator")).toHaveAttribute("data-slot", "menubar-separator");
  });

  it("shortcut 表示を kbd の意味論で提供する", () => {
    render(<EditorMenubarFixture defaultValue="file" />);

    const shortcut = document.querySelector("[data-slot='menubar-shortcut']");

    expect(shortcut?.tagName).toBe("KBD");
    expect(shortcut?.querySelectorAll("[data-slot='kbd']")).toHaveLength(2);
    expect(shortcut).toHaveTextContent("⌘N");
  });

  it("項目を選ぶと操作を実行して menu を閉じる", () => {
    const onSelect = vi.fn();
    render(<EditorMenubarFixture defaultValue="file" onSelect={onSelect} />);

    fireEvent.click(screen.getByRole("menuitem", { name: /新規作成/ }));

    expect(onSelect).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("disabled な項目は操作できない", () => {
    render(<EditorMenubarFixture defaultValue="file" />);

    expect(screen.getByRole("menuitem", { name: "取り込む" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("破壊的な項目を variant で区別する", () => {
    render(<EditorMenubarFixture defaultValue="file" />);

    expect(screen.getByRole("menuitem", { name: "削除する" })).toHaveAttribute(
      "data-variant",
      MENUBAR_ITEM_VARIANT.DESTRUCTIVE,
    );
  });

  it("Escape で閉じる", () => {
    render(<EditorMenubarFixture defaultValue="file" />);

    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("開いた menu から左右キーで隣の menu へ移る", () => {
    render(<EditorMenubarFixture defaultValue="file" />);

    fireEvent.keyDown(screen.getByRole("menu"), { key: "ArrowRight" });

    expect(screen.getByRole("menuitem", { name: "編集" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menuitem", { name: "ファイル" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("checkbox 項目と radio 項目が選択状態を読み上げ可能にする", () => {
    render(
      <Menubar aria-label="表示設定" defaultValue="view">
        <MenubarMenu value="view">
          <MenubarTrigger>表示</MenubarTrigger>
          <MenubarContent>
            <MenubarCheckboxItem checked>名称</MenubarCheckboxItem>
            <MenubarCheckboxItem checked={false}>更新日時</MenubarCheckboxItem>
            <MenubarRadioGroup value="comfortable">
              <MenubarRadioItem value="comfortable">標準</MenubarRadioItem>
              <MenubarRadioItem value="compact">高密度</MenubarRadioItem>
            </MenubarRadioGroup>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>,
    );

    expect(screen.getByRole("menuitemcheckbox", { name: "名称" })).toBeChecked();
    expect(screen.getByRole("menuitemcheckbox", { name: "更新日時" })).not.toBeChecked();
    expect(screen.getByRole("menuitemradio", { name: "標準" })).toBeChecked();
    expect(screen.getByRole("menuitemradio", { name: "高密度" })).not.toBeChecked();
  });

  it("onSelect で既定動作を止めると、続けて切り替えても menu が開いたままになる", () => {
    const onCheckedChange = vi.fn();
    render(
      <Menubar aria-label="表示設定" defaultValue="view">
        <MenubarMenu value="view">
          <MenubarTrigger>表示</MenubarTrigger>
          <MenubarContent>
            <MenubarCheckboxItem
              checked={false}
              onCheckedChange={onCheckedChange}
              onSelect={preventClose}
            >
              名称
            </MenubarCheckboxItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>,
    );

    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "名称" }));

    expect(onCheckedChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("入れ子の menu を trigger の開閉状態とともに提供する", () => {
    render(
      <Menubar aria-label="共有操作" defaultValue="share">
        <MenubarMenu value="share">
          <MenubarTrigger>共有</MenubarTrigger>
          <MenubarContent>
            <MenubarSub>
              <MenubarSubTrigger>権限を変更</MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarItem>閲覧のみ</MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>,
    );

    const subTrigger = screen.getByRole("menuitem", { name: "権限を変更" });

    expect(subTrigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.keyDown(subTrigger, { key: "ArrowRight" });

    expect(screen.getByRole("menuitem", { name: "閲覧のみ" })).toBeInTheDocument();
  });

  it("開いた状態で WCAG AA 相当の a11y 自動検査に違反しない", async () => {
    const { baseElement } = render(<EditorMenubarFixture defaultValue="file" />);

    const result = await axe(baseElement, {
      rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
    });

    expect(result.violations).toEqual([]);
  });
});
