// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { PurchaseDetailSkeleton } from "./skeleton";

describe("PurchaseDetailSkeleton", () => {
  it("出来上がりと同じ 3 つの塊で枠を出す", () => {
    const { container } = render(<PurchaseDetailSkeleton />);

    expect(container.querySelectorAll(".rounded-lg.border")).toHaveLength(3);
  });

  it("読み上げの対象にしない", () => {
    const { container } = render(<PurchaseDetailSkeleton />);

    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<PurchaseDetailSkeleton />);

    expect((await axe(container)).violations).toEqual([]);
  });
});
