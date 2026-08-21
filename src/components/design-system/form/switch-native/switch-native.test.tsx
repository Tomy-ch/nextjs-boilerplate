// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useId } from "react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { SwitchNative } from "./switch-native";
import { SWITCH_SIZE } from "./switch-native.definition";

function SwitchFixture({ disabled = false }: { disabled?: boolean }) {
  const switchId = useId();

  return (
    <div>
      <label htmlFor={switchId}>通知を受け取る</label>
      <SwitchNative
        defaultChecked
        disabled={disabled}
        id={switchId}
        name="notification"
        value="on"
      />
    </div>
  );
}

describe("SwitchNative", () => {
  it("checkbox の意味論で form の値を持つ", () => {
    render(<SwitchFixture />);

    const control = screen.getByRole("checkbox", { name: "通知を受け取る" });

    expect(control).toHaveAttribute("data-slot", "native-switch");
    expect(control).toHaveAttribute("type", "checkbox");
    expect(control).toHaveAttribute("name", "notification");
    expect(control).toHaveAttribute("value", "on");
    expect(control).toBeChecked();
  });

  it("switch role は与えず、実状態と食い違う aria-checked を出さない", () => {
    render(<SwitchFixture />);

    const control = screen.getByRole("checkbox", { name: "通知を受け取る" });

    expect(control).not.toHaveAttribute("role");
    expect(control).not.toHaveAttribute("aria-checked");
  });

  it("クリックで入りと切りを切り替える", async () => {
    render(<SwitchFixture />);

    const control = screen.getByRole("checkbox", { name: "通知を受け取る" });
    await userEvent.click(control);

    expect(control).not.toBeChecked();
  });

  it("disabled 状態では操作不能属性を渡す", () => {
    render(<SwitchFixture disabled />);

    expect(screen.getByRole("checkbox", { name: "通知を受け取る" })).toBeDisabled();
  });

  it("size を data 属性として持つ", () => {
    render(<SwitchNative aria-label="通知" size={SWITCH_SIZE.SMALL} />);

    expect(screen.getByRole("checkbox", { name: "通知" })).toHaveAttribute("data-size", "sm");
  });

  it("size を省略すると既定のサイズになる", () => {
    render(<SwitchNative aria-label="通知" />);

    expect(screen.getByRole("checkbox", { name: "通知" })).toHaveAttribute(
      "data-size",
      SWITCH_SIZE.DEFAULT,
    );
  });

  it("ラベルと関連付けた switch は a11y 自動検査に違反しない", async () => {
    const { container } = render(<SwitchFixture />);

    const result = await axe(container, { rules: { "color-contrast": { enabled: false } } });

    expect(result.violations).toEqual([]);
  });
});
