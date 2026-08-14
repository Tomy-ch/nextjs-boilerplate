// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { MypageSkeleton } from "./skeleton";

describe("MypageSkeleton", () => {
  it("出来上がりと同じ 2 枚の枠を同時に出す", () => {
    const { container } = render(<MypageSkeleton />);

    expect(container.querySelectorAll(".rounded-lg.border")).toHaveLength(2);
  });

  it("カードごとに見出しと項目ぶんの枠を並べる", () => {
    const { container } = render(<MypageSkeleton />);

    expect(container.querySelectorAll("[data-slot=skeleton]")).toHaveLength(2 * (1 + 4));
  });

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
