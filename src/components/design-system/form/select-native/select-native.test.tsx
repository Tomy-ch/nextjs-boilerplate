// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { useId } from "react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { SelectNative, SelectNativeOptGroup, SelectNativeOption } from "./select-native";

function SelectNativeFixture({ disabled = false }: { disabled?: boolean }) {
  const selectId = useId();

  return (
    <div>
      <label htmlFor={selectId}>表示形式</label>
      <SelectNative defaultValue="standard" disabled={disabled} id={selectId} name="display-mode">
        <SelectNativeOptGroup label="表示密度">
          <SelectNativeOption value="compact">簡潔</SelectNativeOption>
          <SelectNativeOption value="standard">標準</SelectNativeOption>
        </SelectNativeOptGroup>
      </SelectNative>
    </div>
  );
}

describe("SelectNative", () => {
  it("form の name と初期選択値を持つ native select を表示する", () => {
    render(<SelectNativeFixture />);

    const select = screen.getByRole("combobox", { name: "表示形式" });

    expect(select).toHaveAttribute("data-slot", "native-select");
    expect(select).toHaveAttribute("name", "display-mode");
    expect(select).toHaveValue("standard");
  });

  it("disabled 状態では native の操作不能属性を渡す", () => {
    render(<SelectNativeFixture disabled />);

    expect(screen.getByRole("combobox", { name: "表示形式" })).toBeDisabled();
  });

  it("ラベルと関連付けた選択 UI は a11y 自動検査に違反しない", async () => {
    const { container } = render(<SelectNativeFixture />);

    const result = await axe(container, { rules: { "color-contrast": { enabled: false } } });

    expect(result.violations).toEqual([]);
  });
});
