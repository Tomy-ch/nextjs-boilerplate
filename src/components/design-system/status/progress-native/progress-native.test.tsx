// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { useId } from "react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { ProgressNative } from "./progress-native";

function LabelledProgressFixture({ max, value }: { max?: number; value: number }) {
  const progressId = useId();

  return (
    <>
      <label htmlFor={progressId}>アップロードの進捗</label>
      <ProgressNative id={progressId} max={max} value={value} />
    </>
  );
}

describe("ProgressNative", () => {
  it("native progress 要素として進捗値と最大値を公開する", () => {
    render(<ProgressNative aria-label="アップロードの進捗" value={40} />);

    const progress = screen.getByRole("progressbar", { name: "アップロードの進捗" });

    expect(progress.tagName).toBe("PROGRESS");
    expect(progress).toHaveAttribute("data-slot", "progress-native");
    expect(progress).toHaveAttribute("value", "40");
  });

  it("max を省略すると 100 を既定にする", () => {
    render(<ProgressNative aria-label="アップロードの進捗" value={40} />);

    expect(screen.getByRole("progressbar")).toHaveAttribute("max", "100");
  });

  it("max を実単位で指定できる", () => {
    render(<ProgressNative aria-label="処理済みの件数" max={8} value={3} />);

    const progress = screen.getByRole("progressbar", { name: "処理済みの件数" });

    expect(progress).toHaveAttribute("max", "8");
    expect(progress).toHaveAttribute("value", "3");
  });

  it("値が 0 でも進捗として描画する", () => {
    render(<ProgressNative aria-label="アップロードの進捗" value={0} />);

    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "0");
  });

  it("label 要素の関連付けをアクセシブルな名前にできる", () => {
    render(<LabelledProgressFixture value={40} />);

    expect(screen.getByRole("progressbar")).toHaveAccessibleName("アップロードの進捗");
  });

  it("className で太さや幅を上書きできる", () => {
    render(<ProgressNative aria-label="アップロードの進捗" className="h-4" value={40} />);

    expect(screen.getByRole("progressbar")).toHaveClass("h-4");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<LabelledProgressFixture value={40} />);

    const result = await axe(container, { rules: { "color-contrast": { enabled: false } } });

    expect(result.violations).toEqual([]);
  });
});
