// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { RadioGroupClient, RadioGroupClientItem } from "./radio-group-client";

function Fixture() {
  return (
    <RadioGroupClient aria-label="表示形式" defaultValue="standard">
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

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<Fixture />);
    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
