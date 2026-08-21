// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useId } from "react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Label } from "../label/label";
import { RadioGroupNative, RadioGroupNativeItem } from "./radio-group-native";

function Fixture() {
  return (
    <RadioGroupNative>
      <legend>表示形式</legend>
      <RadioGroupNativeItem aria-label="簡潔" name="display-mode" value="compact" />
      <RadioGroupNativeItem aria-label="標準" defaultChecked name="display-mode" value="standard" />
    </RadioGroupNative>
  );
}

function LabelInteractionFixture() {
  const compactId = useId();
  const standardId = useId();

  return (
    <RadioGroupNative>
      <Label htmlFor={compactId}>
        <RadioGroupNativeItem id={compactId} name="display-mode" value="compact" />
        簡潔
      </Label>
      <Label htmlFor={standardId}>
        <RadioGroupNativeItem defaultChecked id={standardId} name="display-mode" value="standard" />
        標準
      </Label>
    </RadioGroupNative>
  );
}

describe("RadioGroupNative", () => {
  it("同じ name を持つ native radio を表示する", () => {
    render(<Fixture />);
    expect(screen.getByRole("radio", { name: "標準" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "簡潔" })).toHaveAttribute("name", "display-mode");
  });

  it("選択肢をクリックすると native radio の選択値を切り替える", async () => {
    render(<Fixture />);

    const compact = screen.getByRole("radio", { name: "簡潔" });
    const standard = screen.getByRole("radio", { name: "標準" });

    await userEvent.click(compact);

    expect(compact).toBeChecked();
    expect(standard).not.toBeChecked();
  });

  it("Story と同じラベルのクリックでも選択値を切り替える", async () => {
    render(<LabelInteractionFixture />);

    await userEvent.click(screen.getByText("簡潔"));

    expect(screen.getByRole("radio", { name: "簡潔" })).toBeChecked();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<Fixture />);
    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});

describe("RadioGroupNativeItem", () => {
  it("選択肢 1 件を radio として slot つきで描画する", () => {
    render(<Fixture />);

    expect(screen.getByRole("radio", { name: "簡潔" })).toHaveAttribute(
      "data-slot",
      "radio-group-native-item",
    );
  });

  it("同じ name の中で排他的に切り替わる", async () => {
    render(<Fixture />);

    await userEvent.click(screen.getByRole("radio", { name: "簡潔" }));

    expect(screen.getByRole("radio", { name: "簡潔" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "標準" })).not.toBeChecked();
  });
});
