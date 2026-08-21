// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { ToggleGroupNative, ToggleGroupNativeItem } from "./toggle-group-native";

function SingleFixture() {
  return (
    <ToggleGroupNative aria-label="表示通貨">
      <ToggleGroupNativeItem defaultChecked name="currency" value="jpy">
        JPY
      </ToggleGroupNativeItem>
      <ToggleGroupNativeItem name="currency" value="usd">
        USD
      </ToggleGroupNativeItem>
    </ToggleGroupNative>
  );
}

function MultipleFixture() {
  return (
    <ToggleGroupNative aria-label="表示する列">
      <ToggleGroupNativeItem name="columns" type="checkbox" value="price">
        価格
      </ToggleGroupNativeItem>
      <ToggleGroupNativeItem name="columns" type="checkbox" value="stock">
        アーカイブ
      </ToggleGroupNativeItem>
    </ToggleGroupNative>
  );
}

describe("ToggleGroupNative", () => {
  it("名前を持つ group として公開する", () => {
    render(<SingleFixture />);

    const group = screen.getByRole("group", { name: "表示通貨" });

    expect(group).toHaveAttribute("data-slot", "toggle-group-native");
  });

  it("排他選択は radio として公開し、既定は 1 つだけ選択される", () => {
    render(<SingleFixture />);

    const options = screen.getAllByRole("radio");

    expect(options).toHaveLength(2);
    expect(screen.getByRole("radio", { name: "JPY" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "USD" })).not.toBeChecked();
  });

  it("複数選択は checkbox として公開する", () => {
    render(<MultipleFixture />);

    expect(screen.getAllByRole("checkbox")).toHaveLength(2);
  });

  it("form へ送る name と value を native 属性として持つ", () => {
    render(<SingleFixture />);

    const option = screen.getByRole("radio", { name: "USD" });

    expect(option).toHaveAttribute("name", "currency");
    expect(option).toHaveAttribute("value", "usd");
  });

  it("選ぶと排他的に切り替わる", async () => {
    render(<SingleFixture />);

    await userEvent.click(screen.getByRole("radio", { name: "USD" }));

    expect(screen.getByRole("radio", { name: "USD" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "JPY" })).not.toBeChecked();
  });

  it("複数選択では同時に選べる", async () => {
    render(<MultipleFixture />);

    await userEvent.click(screen.getByRole("checkbox", { name: "価格" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "アーカイブ" }));

    expect(screen.getByRole("checkbox", { name: "価格" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "アーカイブ" })).toBeChecked();
  });

  it("input は視覚的に隠しても支援技術と keyboard から到達できる", () => {
    render(<SingleFixture />);

    const option = screen.getByRole("radio", { name: "JPY" });

    expect(option).toHaveClass("sr-only");
    expect(option).not.toHaveAttribute("aria-hidden");
    expect(option).not.toBeDisabled();
  });

  it("disabled の項目は操作を受け付けない", () => {
    render(
      <ToggleGroupNative aria-label="表示通貨">
        <ToggleGroupNativeItem defaultChecked name="currency" value="jpy">
          JPY
        </ToggleGroupNativeItem>
        <ToggleGroupNativeItem disabled name="currency" value="eur">
          EUR
        </ToggleGroupNativeItem>
      </ToggleGroupNative>,
    );

    const disabled = screen.getByRole("radio", { name: "EUR" });

    expect(disabled).toBeDisabled();
    expect(disabled).not.toBeChecked();
  });

  it("選択中の面と大きさを Toggle と同じ token で示す", () => {
    render(<SingleFixture />);

    const label = screen.getByText("JPY");

    expect(label).toHaveClass("has-[:checked]:bg-accent", "h-9");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<SingleFixture />);

    const result = await axe(container, { rules: { "color-contrast": { enabled: false } } });

    expect(result.violations).toEqual([]);
  });
});

describe("ToggleGroupNativeItem", () => {
  it("選択肢 1 件を label で包んだ radio として描画する", () => {
    render(<SingleFixture />);

    const item = screen.getByRole("radio", { name: "JPY" });

    expect(item.closest('[data-slot="toggle-group-native-item"]')).not.toBeNull();
    expect(item).toBeChecked();
  });

  it("type を checkbox にすると複数選択の選択肢になる", () => {
    render(<MultipleFixture />);

    const item = screen.getByRole("checkbox", { name: "価格" });

    expect(item.closest('[data-slot="toggle-group-native-item"]')).not.toBeNull();
  });
});
