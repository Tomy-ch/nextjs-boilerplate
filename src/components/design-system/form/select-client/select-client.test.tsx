// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import {
  SelectClient,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "./select-client";

function SelectFixture({
  disabled = false,
  position = "popper",
}: {
  disabled?: boolean;
  position?: "item-aligned" | "popper";
}) {
  return (
    <SelectClient defaultValue="standard" disabled={disabled} name="display-mode">
      <SelectTrigger aria-label="表示形式">
        <SelectValue placeholder="選択してください" />
      </SelectTrigger>
      <SelectContent position={position}>
        <SelectGroup>
          <SelectLabel>表示形式</SelectLabel>
          <SelectItem value="compact">簡潔</SelectItem>
          <SelectSeparator />
          <SelectItem value="standard">標準</SelectItem>
        </SelectGroup>
      </SelectContent>
    </SelectClient>
  );
}

describe("SelectClient", () => {
  it("初期値を持つ client 選択 UI を表示する", () => {
    render(<SelectFixture />);

    expect(screen.getByRole("combobox", { name: "表示形式" })).toHaveTextContent("標準");
  });

  it("disabled 状態では trigger を操作不能にする", () => {
    render(<SelectFixture disabled />);

    expect(screen.getByRole("combobox", { name: "表示形式" })).toBeDisabled();
  });

  it("item-aligned の配置も明示的に選べる", () => {
    render(<SelectFixture position="item-aligned" />);

    expect(screen.getByRole("combobox", { name: "表示形式" })).toBeVisible();
  });

  it("aria-label を持つ選択 UI は a11y 自動検査に違反しない", async () => {
    const { container } = render(<SelectFixture />);

    const result = await axe(container, { rules: { "color-contrast": { enabled: false } } });

    expect(result.violations).toEqual([]);
  });
});
