// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useCallback, useId, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { SWITCH_SIZE } from "../switch-native/switch-native.definition";
import { SwitchClient } from "./switch-client";

function ControlledFixture({ onChange }: { onChange?: (checked: boolean) => void }) {
  const switchId = useId();
  const [checked, setChecked] = useState(false);
  const handleChange = useCallback(
    (next: boolean) => {
      setChecked(next);
      onChange?.(next);
    },
    [onChange],
  );

  return (
    <div>
      <label htmlFor={switchId}>通知を受け取る</label>
      <SwitchClient checked={checked} id={switchId} onCheckedChange={handleChange} />
      <p>{checked ? "受け取る" : "受け取らない"}</p>
    </div>
  );
}

describe("SwitchClient", () => {
  it("入りか切りかを伝える switch として提供する", () => {
    render(<ControlledFixture />);

    const control = screen.getByRole("switch", { name: "通知を受け取る" });

    expect(control).toHaveAttribute("data-slot", "switch");
    expect(control).not.toBeChecked();
  });

  it("操作を state として扱い、結果を即座に反映する", async () => {
    const onChange = vi.fn();
    render(<ControlledFixture onChange={onChange} />);

    await userEvent.click(screen.getByRole("switch", { name: "通知を受け取る" }));

    expect(onChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole("switch", { name: "通知を受け取る" })).toBeChecked();
    expect(screen.getByText("受け取る")).toBeInTheDocument();
  });

  it("disabled 状態では操作できない", () => {
    render(<SwitchClient aria-label="通知" disabled />);

    expect(screen.getByRole("switch", { name: "通知" })).toBeDisabled();
  });

  it("size を data 属性として持つ", () => {
    render(<SwitchClient aria-label="通知" size={SWITCH_SIZE.SMALL} />);

    expect(screen.getByRole("switch", { name: "通知" })).toHaveAttribute("data-size", "sm");
  });

  it("size を省略すると SwitchNative と同じ既定サイズになる", () => {
    render(<SwitchClient aria-label="通知" />);

    expect(screen.getByRole("switch", { name: "通知" })).toHaveAttribute(
      "data-size",
      SWITCH_SIZE.DEFAULT,
    );
  });

  it("ラベルと関連付けた switch は a11y 自動検査に違反しない", async () => {
    const { container } = render(<ControlledFixture />);

    const result = await axe(container, { rules: { "color-contrast": { enabled: false } } });

    expect(result.violations).toEqual([]);
  });
});
