// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/design-system/overlay/dropdown-menu/dropdown-menu";
import { ROW_ACTION_KIND, type RowAction } from "./row-actions.definition";
import { RowActionsMenuContent } from "./row-actions-menu-content";

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

function renderMenu(items: readonly RowAction[]) {
  return render(
    <DropdownMenu>
      <DropdownMenuTrigger>行の操作</DropdownMenuTrigger>
      <RowActionsMenuContent items={items} />
    </DropdownMenu>,
  );
}

describe("RowActionsMenuContent", () => {
  it("link を遷移先を持つ項目として並べる", async () => {
    renderMenu([
      { href: "/items/1", id: "detail", kind: ROW_ACTION_KIND.LINK, label: "詳細を見る" },
    ]);

    await userEvent.click(screen.getByRole("button", { name: "行の操作" }));

    expect(screen.getByRole("menuitem", { name: "詳細を見る" })).toHaveAttribute(
      "href",
      "/items/1",
    );
  });

  it("選んだ command は、メニューが閉じて focus が trigger へ戻ってから実行する", async () => {
    const onSelect = vi.fn(() => document.activeElement);

    renderMenu([{ id: "remove", kind: ROW_ACTION_KIND.COMMAND, label: "外す", onSelect }]);

    await userEvent.click(screen.getByRole("button", { name: "行の操作" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "外す" }));

    await waitFor(() => expect(onSelect).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(onSelect).toHaveReturnedWith(screen.getByRole("button", { name: "行の操作" }));
  });

  it("選ばずに閉じたときは command を実行しない", async () => {
    const onSelect = vi.fn();

    renderMenu([{ id: "remove", kind: ROW_ACTION_KIND.COMMAND, label: "外す", onSelect }]);

    await userEvent.click(screen.getByRole("button", { name: "行の操作" }));
    await userEvent.keyboard("{Escape}");

    await waitFor(() => expect(screen.getByRole("button", { name: "行の操作" })).toHaveFocus());
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("command を選んで閉じた後、次に選ばずに閉じても同じ command を再実行しない", async () => {
    const onSelect = vi.fn();

    renderMenu([{ id: "remove", kind: ROW_ACTION_KIND.COMMAND, label: "外す", onSelect }]);

    await userEvent.click(screen.getByRole("button", { name: "行の操作" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "外す" }));
    await waitFor(() => expect(onSelect).toHaveBeenCalledTimes(1));

    await userEvent.click(screen.getByRole("button", { name: "行の操作" }));
    await userEvent.keyboard("{Escape}");

    await waitFor(() => expect(screen.getByRole("button", { name: "行の操作" })).toHaveFocus());
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("無効な command は、選んでも閉じても実行しない", async () => {
    const onSelect = vi.fn();

    renderMenu([
      { disabled: true, id: "remove", kind: ROW_ACTION_KIND.COMMAND, label: "外す", onSelect },
    ]);

    await userEvent.click(screen.getByRole("button", { name: "行の操作" }));

    const item = screen.getByRole("menuitem", { name: "外す" });

    expect(item).toHaveAttribute("aria-disabled", "true");

    await userEvent.click(item);
    await userEvent.keyboard("{Escape}");

    await waitFor(() => expect(screen.getByRole("button", { name: "行の操作" })).toHaveFocus());
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("開いた状態で a11y 検査を通る", async () => {
    const { baseElement } = renderMenu([
      { href: "/items/1", id: "detail", kind: ROW_ACTION_KIND.LINK, label: "詳細を見る" },
      { id: "divider", kind: ROW_ACTION_KIND.SEPARATOR },
      { id: "remove", kind: ROW_ACTION_KIND.COMMAND, label: "外す", onSelect: vi.fn() },
    ]);

    await userEvent.click(screen.getByRole("button", { name: "行の操作" }));

    const result = await axe(baseElement, {
      rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
    });

    expect(result.violations).toEqual([]);
  });
});
