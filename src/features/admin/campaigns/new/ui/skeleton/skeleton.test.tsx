// @vitest-environment jsdom

import { render, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { AdminCampaignCreateSkeleton } from "./skeleton";

const GROUP_COUNT = 5;

const ACTION_COUNT = 2;

function blocksOf(container: HTMLElement): readonly Element[] {
  return [...(container.firstElementChild?.children ?? [])];
}

describe("AdminCampaignCreateSkeleton", () => {
  it("欄の群を 5 つ並べ、その後ろに送る操作を置く", () => {
    const blocks = blocksOf(render(<AdminCampaignCreateSkeleton />).container);
    const groups = blocks.slice(0, GROUP_COUNT);
    const actions = blocks[GROUP_COUNT];

    expect(blocks).toHaveLength(GROUP_COUNT + 1);
    expect(groups.map((group) => group.children.length)).toEqual(
      Array.from({ length: GROUP_COUNT }, () => 2),
    );
    expect(actions?.children).toHaveLength(ACTION_COUNT);
  });

  it("欄の群と操作に並べる枠はすべて待機表示である", () => {
    const blocks = blocksOf(render(<AdminCampaignCreateSkeleton />).container);

    expect(
      blocks
        .flatMap((block) => [...block.children])
        .every((frame) => frame.getAttribute("data-slot") === "skeleton"),
    ).toBe(true);
  });

  it("待機の枠を支援技術へ読ませない", () => {
    const { container } = render(<AdminCampaignCreateSkeleton />);

    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(within(container).queryAllByRole("generic")).toHaveLength(0);
  });

  it("a11y 検査を通る", async () => {
    const { container } = render(<AdminCampaignCreateSkeleton />);

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
