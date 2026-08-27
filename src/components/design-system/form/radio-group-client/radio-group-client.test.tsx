// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { RadioGroupClient, RadioGroupClientItem } from "./radio-group-client";

function Fixture({ onValueChange }: { onValueChange?: (value: string) => void } = {}) {
  return (
    <RadioGroupClient aria-label="表示形式" defaultValue="standard" onValueChange={onValueChange}>
      <RadioGroupClientItem aria-label="簡潔" value="compact" />
      <RadioGroupClientItem aria-label="標準" value="standard" />
    </RadioGroupClient>
  );
}

describe("RadioGroupClient", () => {
  it("初期値を選択した client radio group を表示する", () => {
    render(<Fixture />);
    expect(screen.getByRole("radio", { name: "標準" })).toBeChecked();
  });

  it("別の項目を選ぶと排他的に切り替わり、呼び出し元へ通知する", async () => {
    const onValueChange = vi.fn();

    render(<Fixture onValueChange={onValueChange} />);
    await userEvent.click(screen.getByRole("radio", { name: "簡潔" }));

    expect(screen.getByRole("radio", { name: "簡潔" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "標準" })).not.toBeChecked();
    expect(onValueChange).toHaveBeenCalledWith("compact");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<Fixture />);
    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});

describe("RadioGroupClientItem", () => {
  it("選択肢 1 件を radio として slot つきで描画する", () => {
    render(<Fixture />);

    expect(screen.getByRole("radio", { name: "簡潔" })).toHaveAttribute(
      "data-slot",
      "radio-group-item",
    );
  });

  it("選択中の項目に印を表示する", () => {
    const { container } = render(<Fixture />);

    expect(container.querySelector('[data-slot="radio-group-indicator"]')).not.toBeNull();
  });
});
