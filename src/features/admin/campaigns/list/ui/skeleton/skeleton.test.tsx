// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { AdminCampaignListSkeleton } from "./skeleton";

const ROW_PLACEHOLDER_COUNT = 6;

describe("AdminCampaignListSkeleton", () => {
  it("見出しの枠 1 つと、表の形が伝わる数の行の枠を出す", () => {
    const { container } = render(<AdminCampaignListSkeleton />);

    const [header, ...rows] = Array.from(container.firstElementChild?.children ?? []);

    expect(header).toHaveAttribute("data-slot", "skeleton");
    expect(rows).toHaveLength(ROW_PLACEHOLDER_COUNT);
    for (const row of rows) {
      expect(row).toHaveAttribute("data-slot", "skeleton");
      expect(row.className).toBe(rows[0]?.className);
      expect(row.className).not.toBe(header?.className);
    }
  });

  it("待機の枠を支援技術へ読ませない", () => {
    const { container } = render(<AdminCampaignListSkeleton />);

    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("a11y 検査を通る", async () => {
    const { container } = render(<AdminCampaignListSkeleton />);

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
