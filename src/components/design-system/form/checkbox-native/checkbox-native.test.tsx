// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useId } from "react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { CheckboxNative } from "./checkbox-native";

function CheckboxNativeFixture({ disabled = false }: { disabled?: boolean }) {
  const checkboxId = useId();

  return (
    <div>
      <label htmlFor={checkboxId}>設定を有効にする</label>
      <CheckboxNative
        defaultChecked
        disabled={disabled}
        id={checkboxId}
        name="enabled"
        value="true"
      />
    </div>
  );
}

describe("CheckboxNative", () => {
  it("form の name と初期選択状態を持つ native checkbox を表示する", () => {
    render(<CheckboxNativeFixture />);

    const checkbox = screen.getByRole("checkbox", { name: "設定を有効にする" });

    expect(checkbox).toHaveAttribute("data-slot", "native-checkbox");
    expect(checkbox).toHaveAttribute("name", "enabled");
    expect(checkbox).toHaveAttribute("value", "true");
    expect(checkbox).toBeChecked();
  });

  it("disabled 状態では native の操作不能属性を渡す", () => {
    render(<CheckboxNativeFixture disabled />);

    expect(screen.getByRole("checkbox", { name: "設定を有効にする" })).toBeDisabled();
  });

  it("クリックで native checkbox の選択状態を切り替える", async () => {
    render(<CheckboxNativeFixture />);

    const checkbox = screen.getByRole("checkbox", { name: "設定を有効にする" });
    await userEvent.click(checkbox);

    expect(checkbox).not.toBeChecked();
  });

  it("ラベルと関連付けた checkbox は a11y 自動検査に違反しない", async () => {
    const { container } = render(<CheckboxNativeFixture />);

    const result = await axe(container, { rules: { "color-contrast": { enabled: false } } });

    expect(result.violations).toEqual([]);
  });
});
