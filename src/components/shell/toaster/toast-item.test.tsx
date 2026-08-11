// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ToastItem } from "./toast-item";
import { TOAST_POSITION, TOAST_VARIANT, type Toast } from "./toaster.definition";

const TOAST: Toast = { id: "1", title: "保存しました" };

/** 既定の配置・非停止で 1 件だけ描画する。 */
function renderItem(toast: Toast, onDismiss = vi.fn()) {
  render(
    <ToastItem
      onDismiss={onDismiss}
      paused={false}
      position={TOAST_POSITION.BOTTOM_RIGHT}
      toast={toast}
    />,
  );

  return onDismiss;
}

describe("ToastItem", () => {
  // ----- 正常系 -----
  it("既定では status として見出しを伝える", () => {
    renderItem(TOAST);

    expect(screen.getByRole("status")).toHaveTextContent("保存しました");
  });

  it("説明を添えて表示する", () => {
    renderItem({ ...TOAST, description: "変更は反映済みです。" });

    expect(screen.getByText("変更は反映済みです。")).toBeInTheDocument();
  });

  it("閉じる操作を押すと呼び出し元へ id を渡す", () => {
    const onDismiss = renderItem(TOAST);

    fireEvent.click(screen.getByRole("button", { name: "通知を閉じる" }));

    expect(onDismiss).toHaveBeenCalledWith("1");
  });

  it("操作を押すと実行してから閉じる", () => {
    const onClick = vi.fn();
    const onDismiss = renderItem({ ...TOAST, action: { label: "元に戻す", onClick } });

    fireEvent.click(screen.getByRole("button", { name: "元に戻す" }));

    expect(onClick).toHaveBeenCalledOnce();
    expect(onDismiss).toHaveBeenCalledWith("1");
  });

  // ----- 異常系 -----
  it("destructive な通知は alert として即時に伝える", () => {
    renderItem({ ...TOAST, variant: TOAST_VARIANT.DESTRUCTIVE });

    expect(screen.getByRole("alert")).toHaveTextContent("保存しました");
  });
});
