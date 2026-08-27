// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

function SubMenuFixture() {
  return (
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

  it("項目を選ぶと操作を実行して menu を閉じる", async () => {
    const onSelect = vi.fn();
    render(<ActionMenuFixture onSelect={onSelect} />);

    await userEvent.click(screen.getByRole("menuitem", { name: /詳細を見る/ }));

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

  it("Escape で閉じる", async () => {
    render(<ActionMenuFixture />);

    await userEvent.keyboard("{Escape}");

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

  it("checkbox 項目を選ぶと既定では menu が閉じる", async () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>表示設定</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuCheckboxItem checked={false}>名称</DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    await userEvent.click(screen.getByRole("menuitemcheckbox", { name: "名称" }));

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("onSelect で既定動作を止めると、続けて切り替えても menu が開いたままになる", async () => {
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

    await userEvent.click(screen.getByRole("menuitemcheckbox", { name: "名称" }));
    await userEvent.click(screen.getByRole("menuitemcheckbox", { name: "更新日時" }));

    expect(onCheckedChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("入れ子の menu を trigger の開閉状態とともに提供する", async () => {
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

    await userEvent.keyboard("{ArrowDown}{ArrowRight}");

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

describe("DropdownMenuTrigger", () => {
  it("押すと menu を開く", async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>操作</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>詳細を見る</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    await userEvent.click(screen.getByRole("button", { name: "操作" }));

    expect(screen.getByRole("menu")).toBeInTheDocument();
  });
});

describe("DropdownMenuPortal", () => {
  it("内容を呼び出し位置の外へ描画する", () => {
    const { container } = render(<ActionMenuFixture />);

    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(container.querySelector('[data-slot="dropdown-menu-content"]')).toBeNull();
  });
});

describe("DropdownMenuContent", () => {
  it("menu の意味論と slot を持つ要素を描画する", () => {
    render(<ActionMenuFixture />);

    expect(screen.getByRole("menu")).toHaveAttribute("data-slot", "dropdown-menu-content");
  });
});

describe("DropdownMenuGroup", () => {
  it("項目の束として slot を持つ要素を描画する", () => {
    render(<ActionMenuFixture />);

    expect(document.querySelector('[data-slot="dropdown-menu-group"]')).not.toBeNull();
  });
});

describe("DropdownMenuLabel", () => {
  it("見出しとして slot を持つ要素を描画する", () => {
    render(<ActionMenuFixture />);

    expect(screen.getByText("この行の操作")).toHaveAttribute("data-slot", "dropdown-menu-label");
  });
});

describe("DropdownMenuItem", () => {
  it("menuitem として slot を持つ要素を描画する", () => {
    render(<ActionMenuFixture />);

    expect(screen.getByRole("menuitem", { name: /詳細を見る/ })).toHaveAttribute(
      "data-slot",
      "dropdown-menu-item",
    );
  });

  it("disabled な項目を操作できないものとして示す", () => {
    render(<ActionMenuFixture />);

    expect(screen.getByRole("menuitem", { name: "公開する" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });
});

describe("DropdownMenuSeparator", () => {
  it("区切りとして separator の意味論を持つ要素を描画する", () => {
    render(<ActionMenuFixture />);

    expect(screen.getByRole("separator")).toHaveAttribute("data-slot", "dropdown-menu-separator");
  });
});

describe("DropdownMenuShortcut", () => {
  it("shortcut 表示を kbd の意味論で描画する", () => {
    render(<ActionMenuFixture />);

    const shortcut = document.querySelector('[data-slot="dropdown-menu-shortcut"]');

    expect(shortcut?.tagName).toBe("KBD");
    expect(shortcut).toHaveTextContent("⇧D");
  });
});

describe("DropdownMenuCheckboxItem", () => {
  it("選択状態を menuitemcheckbox として読み上げ可能にする", () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>表示設定</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuCheckboxItem checked>名称</DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked={false}>更新日時</DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    expect(screen.getByRole("menuitemcheckbox", { name: "名称" })).toBeChecked();
    expect(screen.getByRole("menuitemcheckbox", { name: "更新日時" })).not.toBeChecked();
  });
});

describe("DropdownMenuRadioGroup", () => {
  it("排他選択の束として slot を持つ要素を描画する", () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>表示設定</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuRadioGroup value="comfortable">
            <DropdownMenuRadioItem value="comfortable">標準</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    expect(document.querySelector('[data-slot="dropdown-menu-radio-group"]')).not.toBeNull();
  });
});

describe("DropdownMenuRadioItem", () => {
  it("選択状態を menuitemradio として読み上げ可能にする", () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>表示設定</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuRadioGroup value="comfortable">
            <DropdownMenuRadioItem value="comfortable">標準</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="compact">高密度</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    expect(screen.getByRole("menuitemradio", { name: "標準" })).toBeChecked();
    expect(screen.getByRole("menuitemradio", { name: "高密度" })).not.toBeChecked();
  });
});

describe("DropdownMenuSub", () => {
  it("入れ子の menu を閉じた状態で用意する", () => {
    render(<SubMenuFixture />);

    expect(screen.getByRole("menuitem", { name: "権限を変更" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });
});

describe("DropdownMenuSubTrigger", () => {
  it("開く操作として slot を持つ要素を描画する", () => {
    render(<SubMenuFixture />);

    expect(screen.getByRole("menuitem", { name: "権限を変更" })).toHaveAttribute(
      "data-slot",
      "dropdown-menu-sub-trigger",
    );
  });
});

describe("DropdownMenuSubContent", () => {
  it("入れ子の menu を開くと項目を描画する", async () => {
    render(<SubMenuFixture />);

    await userEvent.keyboard("{ArrowDown}{ArrowRight}");

    expect(screen.getByRole("menuitem", { name: "閲覧のみ" })).toBeInTheDocument();
  });
});
