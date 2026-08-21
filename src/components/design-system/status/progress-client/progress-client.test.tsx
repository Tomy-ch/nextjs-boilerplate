// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useCallback, useId, useState } from "react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { ProgressClient } from "./progress-client";

function LabelledProgressFixture() {
  const labelId = useId();

  return (
    <>
      <span id={labelId}>アップロードの進捗</span>
      <ProgressClient aria-labelledby={labelId} value={40} />
    </>
  );
}

function AdvancingProgressFixture() {
  const [value, setValue] = useState(20);
  const advance = useCallback(() => setValue(80), []);

  return (
    <>
      <ProgressClient aria-label="アップロードの進捗" value={value} />
      <button onClick={advance} type="button">
        進める
      </button>
    </>
  );
}

describe("ProgressClient", () => {
  it("progressbar role として進捗値と最大値を公開する", () => {
    render(<ProgressClient aria-label="アップロードの進捗" value={40} />);

    const progress = screen.getByRole("progressbar", { name: "アップロードの進捗" });

    expect(progress).toHaveAttribute("data-slot", "progress");
    expect(progress).toHaveAttribute("aria-valuenow", "40");
    expect(progress).toHaveAttribute("aria-valuemax", "100");
  });

  it("max を実単位で指定すると、進捗部分の幅を value と max の比で決める", () => {
    render(<ProgressClient aria-label="処理済みの件数" max={8} value={3} />);

    const progress = screen.getByRole("progressbar");

    expect(progress).toHaveAttribute("aria-valuemax", "8");
    expect(progress).toHaveAttribute("aria-valuenow", "3");
    expect(progress.firstElementChild).toHaveStyle({ transform: "translateX(-62.5%)" });
  });

  it("値が 0 のとき進捗部分を全幅ぶん退避させる", () => {
    render(<ProgressClient aria-label="アップロードの進捗" value={0} />);

    expect(screen.getByRole("progressbar").firstElementChild).toHaveStyle({
      transform: "translateX(-100%)",
    });
  });

  it("値が max に達すると進捗部分を全幅表示する", () => {
    render(<ProgressClient aria-label="アップロードの進捗" value={100} />);

    expect(screen.getByRole("progressbar").firstElementChild).toHaveStyle({
      transform: "translateX(-0%)",
    });
  });

  it("呼び出し元が値を更新すると表示へ反映する", async () => {
    render(<AdvancingProgressFixture />);

    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "20");

    await userEvent.click(screen.getByRole("button", { name: "進める" }));

    const progress = screen.getByRole("progressbar");

    expect(progress).toHaveAttribute("aria-valuenow", "80");
    expect(progress.firstElementChild).toHaveStyle({ transform: "translateX(-20%)" });
  });

  it("aria-labelledby で外の見出しをアクセシブルな名前にできる", () => {
    render(<LabelledProgressFixture />);

    expect(screen.getByRole("progressbar")).toHaveAccessibleName("アップロードの進捗");
  });

  it("className で太さや幅を上書きできる", () => {
    render(<ProgressClient aria-label="アップロードの進捗" className="h-4" value={40} />);

    expect(screen.getByRole("progressbar")).toHaveClass("h-4");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<LabelledProgressFixture />);

    const result = await axe(container, { rules: { "color-contrast": { enabled: false } } });

    expect(result.violations).toEqual([]);
  });
});
