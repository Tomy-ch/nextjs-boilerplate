// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

function SelectionMenubarFixture() {
  return (
    <Menubar aria-label="表示設定" defaultValue="view">
      <MenubarMenu value="view">
        <MenubarTrigger>表示</MenubarTrigger>
        <MenubarContent>
          <MenubarCheckboxItem checked>行番号</MenubarCheckboxItem>
          <MenubarCheckboxItem checked={false}>余白</MenubarCheckboxItem>
          <MenubarRadioGroup value="comfortable">
            <MenubarRadioItem value="comfortable">標準</MenubarRadioItem>
            <MenubarRadioItem value="compact">高密度</MenubarRadioItem>
          </MenubarRadioGroup>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );
}

function SubMenubarFixture() {
  return (
    <Menubar aria-label="ファイル操作" defaultValue="file">
      <MenubarMenu value="file">
        <MenubarTrigger>ファイル</MenubarTrigger>
        <MenubarContent>
          <MenubarSub>
            <MenubarSubTrigger>書き出し</MenubarSubTrigger>
            <MenubarSubContent>
              <MenubarItem>PDF</MenubarItem>
            </MenubarSubContent>
          </MenubarSub>
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

  it("trigger を押すと対応する menu を開く", async () => {
    render(<EditorMenubarFixture />);

    await userEvent.click(screen.getByRole("menuitem", { name: "ファイル" }));

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

  it("項目を選ぶと操作を実行して menu を閉じる", async () => {
    const onSelect = vi.fn();
    render(<EditorMenubarFixture defaultValue="file" onSelect={onSelect} />);

    await userEvent.click(screen.getByRole("menuitem", { name: /新規作成/ }));

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

  it("Escape で閉じる", async () => {
    render(<EditorMenubarFixture defaultValue="file" />);

    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("開いた menu から左右キーで隣の menu へ移る", async () => {
    render(<EditorMenubarFixture defaultValue="file" />);

    await userEvent.keyboard("{ArrowRight}");

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

  it("onSelect で既定動作を止めると、続けて切り替えても menu が開いたままになる", async () => {
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

    await userEvent.click(screen.getByRole("menuitemcheckbox", { name: "名称" }));

    expect(onCheckedChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("入れ子の menu を trigger の開閉状態とともに提供する", async () => {
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

    await userEvent.keyboard("{ArrowDown}{ArrowRight}");

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

describe("MenubarMenu", () => {
  it("menu 1 つ分の trigger を menubar の項目として並べる", () => {
    render(<EditorMenubarFixture />);

    expect(screen.getAllByRole("menuitem")).toHaveLength(2);
  });
});

describe("MenubarTrigger", () => {
  it("開く操作として slot を持つ要素を描画する", () => {
    render(<EditorMenubarFixture />);

    expect(screen.getByRole("menuitem", { name: "ファイル" })).toHaveAttribute(
      "data-slot",
      "menubar-trigger",
    );
  });

  it("既定で開く menu を指定できる", () => {
    render(<EditorMenubarFixture defaultValue="file" />);

    expect(screen.getByRole("menuitem", { name: "ファイル" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });
});

describe("MenubarPortal", () => {
  it("内容を呼び出し位置の外へ描画する", () => {
    const { container } = render(<EditorMenubarFixture defaultValue="file" />);

    expect(container.querySelector('[data-slot="menubar-content"]')).toBeNull();
    expect(document.querySelector('[data-slot="menubar-content"]')).not.toBeNull();
  });
});

describe("MenubarContent", () => {
  it("開いた menu として slot を持つ要素を描画する", () => {
    render(<EditorMenubarFixture defaultValue="file" />);

    expect(document.querySelector('[data-slot="menubar-content"]')).not.toBeNull();
  });

  it("閉じている間は内容を描画しない", () => {
    render(<EditorMenubarFixture />);

    expect(document.querySelector('[data-slot="menubar-content"]')).toBeNull();
  });
});

describe("MenubarGroup", () => {
  it("項目の束として slot を持つ要素を描画する", () => {
    render(<EditorMenubarFixture defaultValue="file" />);

    expect(document.querySelector('[data-slot="menubar-group"]')).not.toBeNull();
  });
});

describe("MenubarLabel", () => {
  it("見出しとして slot を持つ要素を描画する", () => {
    render(<EditorMenubarFixture defaultValue="file" />);

    expect(screen.getByText("この文書の操作")).toHaveAttribute("data-slot", "menubar-label");
  });
});

describe("MenubarItem", () => {
  it("menuitem として slot を持つ要素を描画する", () => {
    render(<EditorMenubarFixture defaultValue="file" />);

    expect(screen.getByRole("menuitem", { name: /新規作成/ })).toHaveAttribute(
      "data-slot",
      "menubar-item",
    );
  });

  it("disabled な項目を操作できないものとして示す", () => {
    render(<EditorMenubarFixture defaultValue="file" />);

    expect(screen.getByRole("menuitem", { name: "取り込む" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });
});

describe("MenubarSeparator", () => {
  it("区切りとして separator の意味論を持つ要素を描画する", () => {
    render(<EditorMenubarFixture defaultValue="file" />);

    expect(screen.getByRole("separator")).toHaveAttribute("data-slot", "menubar-separator");
  });
});

describe("MenubarShortcut", () => {
  it("shortcut 表示を kbd の意味論で描画する", () => {
    render(<EditorMenubarFixture defaultValue="file" />);

    const shortcut = document.querySelector('[data-slot="menubar-shortcut"]');

    expect(shortcut?.tagName).toBe("KBD");
    expect(shortcut).toHaveTextContent("⌘N");
  });
});

describe("MenubarCheckboxItem", () => {
  it("選択状態を menuitemcheckbox として読み上げ可能にする", () => {
    render(<SelectionMenubarFixture />);

    expect(screen.getByRole("menuitemcheckbox", { name: "行番号" })).toBeChecked();
    expect(screen.getByRole("menuitemcheckbox", { name: "余白" })).not.toBeChecked();
  });
});

describe("MenubarRadioGroup", () => {
  it("排他選択の束として slot を持つ要素を描画する", () => {
    render(<SelectionMenubarFixture />);

    expect(document.querySelector('[data-slot="menubar-radio-group"]')).not.toBeNull();
  });
});

describe("MenubarRadioItem", () => {
  it("群の値と一致するものが選択状態になる", () => {
    render(<SelectionMenubarFixture />);

    expect(screen.getByRole("menuitemradio", { name: "標準" })).toBeChecked();
    expect(screen.getByRole("menuitemradio", { name: "高密度" })).not.toBeChecked();
  });
});

describe("MenubarSub", () => {
  it("入れ子の menu を閉じた状態で用意する", () => {
    render(<SubMenubarFixture />);

    expect(screen.getByRole("menuitem", { name: "書き出し" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });
});

describe("MenubarSubTrigger", () => {
  it("開く操作として slot を持つ要素を描画する", () => {
    render(<SubMenubarFixture />);

    expect(screen.getByRole("menuitem", { name: "書き出し" })).toHaveAttribute(
      "data-slot",
      "menubar-sub-trigger",
    );
  });
});

describe("MenubarSubContent", () => {
  it("入れ子の menu を開くと項目を描画する", async () => {
    render(<SubMenubarFixture />);

    await userEvent.keyboard("{ArrowDown}{ArrowRight}");

    expect(screen.getByRole("menuitem", { name: "PDF" })).toBeInTheDocument();
  });
});
