// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useCallback, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { SliderClient } from "./slider-client";

function LabelledSliderFixture() {
  return <SliderClient defaultValue={[20, 70]} thumbLabels={["下限価格", "上限価格"]} />;
}

function ControlledSliderFixture() {
  const [range, setRange] = useState([20, 70]);
  const handleChange = useCallback((next: number[]) => setRange(next), []);

  return (
    <>
      <SliderClient
        onValueChange={handleChange}
        thumbLabels={["下限価格", "上限価格"]}
        value={range}
      />
      <output>
        {range[0]}-{range[1]}
      </output>
    </>
  );
}

describe("SliderClient", () => {
  it("値の数だけ slider role の thumb を置く", () => {
    render(<SliderClient defaultValue={[20, 70]} thumbLabels={["下限価格", "上限価格"]} />);

    const thumbs = screen.getAllByRole("slider");

    expect(thumbs).toHaveLength(2);
    expect(thumbs[0]).toHaveAttribute("aria-valuenow", "20");
    expect(thumbs[1]).toHaveAttribute("aria-valuenow", "70");
  });

  it("単一の値を渡すと thumb は一つになる", () => {
    render(<SliderClient defaultValue={[40]} thumbLabels={["上限価格"]} />);

    expect(screen.getAllByRole("slider")).toHaveLength(1);
  });

  it("value と defaultValue を省略すると min を初期値とする thumb を一つ置く", () => {
    render(<SliderClient max={80} min={10} thumbLabels={["上限価格"]} />);

    const thumbs = screen.getAllByRole("slider");

    expect(thumbs).toHaveLength(1);
    expect(thumbs[0]).toHaveAttribute("aria-valuenow", "10");
  });

  it("aria-valuemin / aria-valuemax は thumb の可動域ではなく slider 全体の値域を指す", () => {
    render(
      <SliderClient
        defaultValue={[20, 70]}
        max={80}
        min={10}
        thumbLabels={["下限価格", "上限価格"]}
      />,
    );

    const [lower] = screen.getAllByRole("slider");

    expect(lower).toHaveAttribute("aria-valuemin", "10");
    expect(lower).toHaveAttribute("aria-valuemax", "80");
  });

  it("keyboard 操作で値を変え、呼び出し元へ通知する", async () => {
    const onValueChange = vi.fn();
    render(
      <SliderClient defaultValue={[40]} onValueChange={onValueChange} thumbLabels={["上限価格"]} />,
    );

    await userEvent.type(screen.getByRole("slider"), "{ArrowRight}");

    expect(onValueChange).toHaveBeenCalledWith([41]);
  });

  it("制御 component として呼び出し元の値を表示へ反映する", async () => {
    render(<ControlledSliderFixture />);

    const upper = screen.getAllByRole("slider")[1];

    if (upper !== undefined) {
      await userEvent.type(upper, "{ArrowRight}");
    }

    expect(screen.getByRole("status")).toHaveTextContent("20-71");
  });

  it("thumbLabels が thumb ごとのアクセシブルな名前になる", () => {
    render(<LabelledSliderFixture />);

    const thumbs = screen.getAllByRole("slider");

    expect(thumbs[0]).toHaveAccessibleName("下限価格");
    expect(thumbs[1]).toHaveAccessibleName("上限価格");
  });

  it("disabled のとき操作を受け付けない", async () => {
    const onValueChange = vi.fn();
    render(
      <SliderClient
        defaultValue={[40]}
        disabled
        onValueChange={onValueChange}
        thumbLabels={["上限価格"]}
      />,
    );

    await userEvent.type(screen.getByRole("slider"), "{ArrowRight}");

    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("className で見た目を上書きできる", () => {
    render(<SliderClient className="h-44" defaultValue={[40]} thumbLabels={["上限価格"]} />);

    expect(screen.getByRole("slider").closest("[data-slot='slider']")).toHaveClass("h-44");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<LabelledSliderFixture />);

    const result = await axe(container, { rules: { "color-contrast": { enabled: false } } });

    expect(result.violations).toEqual([]);
  });
});
