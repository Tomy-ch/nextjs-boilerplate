// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { MypageSkeleton } from "./skeleton";

describe("MypageSkeleton", () => {
  it("待機表示そのものを読み上げから外す", () => {
    const { container } = render(<MypageSkeleton />);

    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("戻せない操作を待機中に出さない", () => {
    const { container } = render(<MypageSkeleton />);

    expect(container.textContent).toBe("");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<MypageSkeleton />);

    expect((await axe(container)).violations).toEqual([]);
  });
});
