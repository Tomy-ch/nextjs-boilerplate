// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { useId } from "react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { SliderNative } from "./slider-native";

function LabelledSliderFixture() {
  const sliderId = useId();

  return (
    <>
      <label htmlFor={sliderId}>上限価格</label>
      <SliderNative defaultValue={40} id={sliderId} name="priceMax" />
    </>
  );
}

describe("SliderNative", () => {
  it("native range 入力として slider role と現在値を公開する", () => {
    render(<SliderNative aria-label="上限価格" defaultValue={40} />);

    const slider = screen.getByRole("slider", { name: "上限価格" });

    expect(slider.tagName).toBe("INPUT");
    expect(slider).toHaveAttribute("type", "range");
    expect(slider).toHaveAttribute("data-slot", "slider-native");
    expect(slider).toHaveValue("40");
  });

  it("min / max / step を native 属性として受け取る", () => {
    render(<SliderNative aria-label="表示件数" defaultValue={20} max={50} min={10} step={5} />);

    const slider = screen.getByRole("slider");

    expect(slider).toHaveAttribute("min", "10");
    expect(slider).toHaveAttribute("max", "50");
    expect(slider).toHaveAttribute("step", "5");
  });

  it("操作すると値が変わる", () => {
    render(<SliderNative aria-label="上限価格" defaultValue={40} />);

    const slider = screen.getByRole("slider");

    // **ここは `user-event` を使いません。**`input[type=range]` の値を動かすのはつまみの
    // ドラッグで、jsdom は要素の矩形を持たないため再現できません。
    fireEvent.change(slider, { target: { value: "70" } });

    expect(slider).toHaveValue("70");
  });

  it("form の name と value を native 属性として持つ", () => {
    render(<LabelledSliderFixture />);

    expect(screen.getByRole("slider")).toHaveAttribute("name", "priceMax");
  });

  it("label 要素の関連付けをアクセシブルな名前にできる", () => {
    render(<LabelledSliderFixture />);

    expect(screen.getByRole("slider")).toHaveAccessibleName("上限価格");
  });

  it("disabled のとき操作を受け付けない", () => {
    render(<SliderNative aria-label="上限価格" defaultValue={40} disabled />);

    expect(screen.getByRole("slider")).toBeDisabled();
  });

  it("className で見た目を上書きできる", () => {
    render(<SliderNative aria-label="上限価格" className="h-6" defaultValue={40} />);

    expect(screen.getByRole("slider")).toHaveClass("h-6");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<LabelledSliderFixture />);

    const result = await axe(container, { rules: { "color-contrast": { enabled: false } } });

    expect(result.violations).toEqual([]);
  });
});
