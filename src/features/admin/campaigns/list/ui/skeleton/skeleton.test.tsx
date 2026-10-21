// @vitest-environment jsdom

import { render, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { AdminCampaignListSkeleton } from "./skeleton";

describe("AdminCampaignListSkeleton", () => {
  it("見出しの枠 1 つと、表の形が伝わる数の行の枠を出す", () => {
    const { container } = render(<AdminCampaignListSkeleton />);

    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(7);
  });

  it("待機の枠を支援技術へ読ませない", () => {
    const { container } = render(<AdminCampaignListSkeleton />);

    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(within(container).queryAllByRole("generic")).toHaveLength(0);
  });

  it("a11y 検査を通る", async () => {
    const { container } = render(<AdminCampaignListSkeleton />);

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
