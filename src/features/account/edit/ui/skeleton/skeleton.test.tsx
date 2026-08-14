// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { ProfileEditSkeleton } from "./skeleton";

describe("ProfileEditSkeleton", () => {
  it("実物と同じ 9 項目ぶんの枠を出す", () => {
    const { container } = render(<ProfileEditSkeleton />);

    expect(container.querySelectorAll("[data-slot=skeleton]")).toHaveLength(9 * 2);
  });

  it("項目ごとに項目名と入力欄の枠を対で出す", () => {
    const { container } = render(<ProfileEditSkeleton />);
    const [label, control] = container.querySelectorAll("[data-slot=skeleton]");

    expect(label).toHaveClass("h-4");
    expect(control).toHaveClass("h-10");
  });

  it("待機表示そのものを読み上げから外す", () => {
    const { container } = render(<ProfileEditSkeleton />);

    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<ProfileEditSkeleton />);

    expect((await axe(container)).violations).toEqual([]);
  });
});
