// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { CheckboxClient } from "./checkbox-client";

describe("CheckboxClient", () => {
  it("選択済みの client checkbox を表示する", () => {
    render(<CheckboxClient aria-label="設定を有効にする" defaultChecked />);

    expect(screen.getByRole("checkbox", { name: "設定を有効にする" })).toBeChecked();
  });

  it("indeterminate は checked と別の状態として支援技術へ伝える", () => {
    render(<CheckboxClient aria-label="すべて選択" checked="indeterminate" />);

    expect(screen.getByRole("checkbox", { name: "すべて選択" })).toHaveAttribute(
      "aria-checked",
      "mixed",
    );
  });

  it("クリックで選択を切り替え、呼び出し元へ通知する", () => {
    const onCheckedChange = vi.fn();

    render(<CheckboxClient aria-label="設定を有効にする" onCheckedChange={onCheckedChange} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "設定を有効にする" }));

    expect(screen.getByRole("checkbox", { name: "設定を有効にする" })).toBeChecked();
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("disabled 状態では操作不能にする", () => {
    render(<CheckboxClient aria-label="設定を有効にする" disabled />);

    expect(screen.getByRole("checkbox", { name: "設定を有効にする" })).toBeDisabled();
  });

  it("項目名を持つ checkbox は a11y 自動検査に違反しない", async () => {
    const { container } = render(<CheckboxClient aria-label="設定を有効にする" />);

    const result = await axe(container, { rules: { "color-contrast": { enabled: false } } });

    expect(result.violations).toEqual([]);
  });
});
