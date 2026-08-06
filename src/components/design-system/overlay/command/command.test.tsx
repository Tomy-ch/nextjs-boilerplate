// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "./command";

beforeAll(() => {
  // cmdk は候補の寸法計測と表示位置の追従に使う API を jsdom が持たないため、ここで補う。
  Element.prototype.scrollIntoView = vi.fn();
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

function CommandFixture({
  onSelect,
  shouldFilter = true,
}: {
  onSelect?: () => void;
  shouldFilter?: boolean;
}) {
  return (
    <Command label="操作を検索" shouldFilter={shouldFilter}>
      <CommandInput placeholder="操作を検索" />
      <CommandList>
        <CommandEmpty>一致する操作はありません。</CommandEmpty>
        <CommandGroup heading="移動">
          <CommandItem onSelect={onSelect}>一覧を開く</CommandItem>
          <CommandItem onSelect={onSelect}>予定を開く</CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="設定">
          <CommandItem onSelect={onSelect}>
            表示設定
            <CommandShortcut>⌘,</CommandShortcut>
          </CommandItem>
          <CommandItem disabled onSelect={onSelect}>
            権限の管理
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

describe("Command", () => {
  it("検索入力と候補一覧を combobox と listbox の意味論で公開する", () => {
    render(<CommandFixture />);

    const input = screen.getByRole("combobox");
    const list = screen.getByRole("listbox");

    expect(input).toHaveAttribute("aria-controls", list.id);
    expect(input).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByRole("option")).toHaveLength(4);
  });

  it("Command の label が検索入力のアクセシブルな名前になる", () => {
    render(<CommandFixture />);

    expect(screen.getByRole("combobox")).toHaveAccessibleName("操作を検索");
  });

  it("CommandInput の aria-label では名前にならず、Command の label が必要になる", () => {
    render(
      <Command>
        <CommandInput aria-label="操作を検索" />
        <CommandList>
          <CommandItem>一覧を開く</CommandItem>
        </CommandList>
      </Command>,
    );

    expect(screen.getByRole("combobox")).toHaveAccessibleName("");
  });

  it("候補一覧は日本語のアクセシブルな名前を持つ", () => {
    render(<CommandFixture />);

    expect(screen.getByRole("listbox")).toHaveAccessibleName("候補");
  });

  it("入力した語で候補を絞り込む", () => {
    render(<CommandFixture />);

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "予定" } });

    expect(screen.getByRole("option", { name: "予定を開く" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "一覧を開く" })).not.toBeInTheDocument();
  });

  it("一致する候補が無いときだけ空の案内を表示する", () => {
    render(<CommandFixture />);

    expect(screen.queryByText("一致する操作はありません。")).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "該当なし" } });

    expect(screen.getByText("一致する操作はありません。")).toBeVisible();
  });

  it("shouldFilter を false にすると入力しても候補を絞り込まない", () => {
    render(<CommandFixture shouldFilter={false} />);

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "該当なし" } });

    expect(screen.getAllByRole("option")).toHaveLength(4);
  });

  it("group は見出しでラベル付けされる", () => {
    render(<CommandFixture />);

    expect(screen.getByRole("group", { name: "移動" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "設定" })).toBeInTheDocument();
  });

  it("disabled の候補は選択対象から外れる", () => {
    const onSelect = vi.fn();
    render(<CommandFixture onSelect={onSelect} />);

    const disabledOption = screen.getByRole("option", { name: "権限の管理" });

    expect(disabledOption).toHaveAttribute("aria-disabled", "true");

    fireEvent.click(disabledOption);

    expect(onSelect).not.toHaveBeenCalled();
  });

  it("候補を選ぶと onSelect を呼ぶ", () => {
    const onSelect = vi.fn();
    render(<CommandFixture onSelect={onSelect} />);

    fireEvent.click(screen.getByRole("option", { name: "一覧を開く" }));

    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("下キーで選択中の候補を移動する", () => {
    render(<CommandFixture />);

    const input = screen.getByRole("combobox");

    expect(screen.getByRole("option", { name: "一覧を開く" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    fireEvent.keyDown(input, { key: "ArrowDown" });

    expect(screen.getByRole("option", { name: "予定を開く" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<CommandFixture />);

    const result = await axe(container, { rules: { "color-contrast": { enabled: false } } });

    expect(result.violations).toEqual([]);
  });
});

describe("CommandDialog", () => {
  it("開くまで内容を表示しない", () => {
    render(
      <CommandDialog open={false}>
        <CommandInput placeholder="操作を検索" />
        <CommandList>
          <CommandItem>一覧を開く</CommandItem>
        </CommandList>
      </CommandDialog>,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("視覚的に隠した title と説明を dialog の名前と説明として関連付ける", () => {
    render(
      <CommandDialog description="実行する操作を検索します。" open title="操作の検索">
        <CommandInput placeholder="操作を検索" />
        <CommandList>
          <CommandItem>一覧を開く</CommandItem>
        </CommandList>
      </CommandDialog>,
    );

    const dialog = screen.getByRole("dialog", { name: "操作の検索" });

    expect(dialog).toHaveAccessibleDescription("実行する操作を検索します。");
  });

  it("title を内側の検索入力のアクセシブルな名前にも渡す", () => {
    render(
      <CommandDialog open title="操作の検索">
        <CommandInput placeholder="操作を検索" />
        <CommandList>
          <CommandItem>一覧を開く</CommandItem>
        </CommandList>
      </CommandDialog>,
    );

    expect(screen.getByRole("combobox")).toHaveAccessibleName("操作の検索");
  });

  it("showCloseButton を false にすると右上の閉じる操作を描画しない", () => {
    render(
      <CommandDialog open showCloseButton={false}>
        <CommandInput placeholder="操作を検索" />
        <CommandList>
          <CommandItem>一覧を開く</CommandItem>
        </CommandList>
      </CommandDialog>,
    );

    expect(screen.queryByRole("button", { name: "閉じる" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("Escape で閉じる", () => {
    const onOpenChange = vi.fn();
    render(
      <CommandDialog onOpenChange={onOpenChange} open>
        <CommandInput placeholder="操作を検索" />
        <CommandList>
          <CommandItem>一覧を開く</CommandItem>
        </CommandList>
      </CommandDialog>,
    );

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("開いた状態で a11y 自動検査に違反しない", async () => {
    const { baseElement } = render(
      <CommandDialog open title="操作の検索">
        <CommandInput placeholder="操作を検索" />
        <CommandList>
          <CommandEmpty>一致する操作はありません。</CommandEmpty>
          <CommandGroup heading="移動">
            <CommandItem>一覧を開く</CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>,
    );

    const result = await axe(baseElement, { rules: { "color-contrast": { enabled: false } } });

    expect(result.violations).toEqual([]);
  });
});
