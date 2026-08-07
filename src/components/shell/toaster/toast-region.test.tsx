// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ToastRegion } from "./toast-region";
import { DEFAULT_TOAST_HOTKEY, TOAST_POSITION, type Toast } from "./toaster.definition";

const TOASTS: Toast[] = [
  { id: "1", title: "保存しました" },
  { id: "2", title: "公開しました" },
];

/** 既定の hotkey・非展開で領域を描画する。 */
function renderRegion(toasts: Toast[] = TOASTS, expand = false) {
  const onDismiss = vi.fn();

  render(
    <ToastRegion
      expand={expand}
      hotkey={DEFAULT_TOAST_HOTKEY}
      label="通知"
      onDismiss={onDismiss}
      position={TOAST_POSITION.BOTTOM_RIGHT}
      toasts={toasts}
    />,
  );

  return onDismiss;
}

describe("ToastRegion", () => {
  // ----- 正常系 -----
  it("名前を持つ region として通知を並べる", () => {
    renderRegion();

    const region = screen.getByRole("region", { name: "通知" });

    expect(region).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("hotkey を押すと領域へ焦点を移す", () => {
    renderRegion();

    fireEvent.keyDown(window, { code: "KeyT", altKey: true });

    expect(screen.getByRole("region", { name: "通知" })).toHaveFocus();
  });

  // ----- 異常系 -----
  it("修飾キーが一致しない打鍵では焦点を移さない", () => {
    renderRegion();

    fireEvent.keyDown(window, { code: "KeyT", altKey: false });

    expect(screen.getByRole("region", { name: "通知" })).not.toHaveFocus();
  });

  it("通知が無ければ項目を並べない", () => {
    renderRegion([]);

    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });
});
