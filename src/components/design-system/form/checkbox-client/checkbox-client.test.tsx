// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { CheckboxClient } from "./checkbox-client";

describe("CheckboxClient", () => {
  it("選択済みの client checkbox を表示する", () => {
    render(<CheckboxClient aria-label="設定を有効にする" defaultChecked />);

    expect(screen.getByRole("checkbox", { name: "設定を有効にする" })).toBeChecked();
  });

  it("indeterminate は checked と別の印を持つ", () => {
    const { container } = render(
      <CheckboxClient aria-label="すべて選択" checked="indeterminate" />,
    );

    const icons = [...container.querySelectorAll("svg")].map((icon) => icon.getAttribute("class"));

    expect(icons).toHaveLength(2);
    expect(icons.join(" ")).toContain("lucide-minus");
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
