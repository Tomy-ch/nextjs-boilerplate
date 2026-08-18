// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { ProfileEditSkeleton } from "./skeleton";

describe("ProfileEditSkeleton", () => {
  it("待機している間は読める中身を出さない", () => {
    const { container } = render(<ProfileEditSkeleton />);

    expect(container.textContent).toBe("");
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
