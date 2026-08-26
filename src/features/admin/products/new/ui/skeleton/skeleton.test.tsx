// @vitest-environment jsdom

import { render, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { AdminProductCreateSkeleton } from "./skeleton";

/** 入力欄の枠の数。`skeleton.tsx` の `PLACEHOLDER_FIELDS` と揃える。 */
const FIELD_COUNT = 4;

/** 段を行き来する操作の数。前へ戻る側と次へ進む側。 */
const NAVIGATION_COUNT = 2;

/** 待機表示の 3 つの区画。進捗・入力欄・行き来する操作の順に並ぶ。 */
function blocksOf(container: HTMLElement): readonly Element[] {
  return [...(container.firstElementChild?.children ?? [])];
}

describe("AdminProductCreateSkeleton", () => {
  it("進捗・入力欄・行き来する操作を、この順で出す", () => {
    const [progress, fields, navigation] = blocksOf(
      render(<AdminProductCreateSkeleton />).container,
    );

    expect(progress).toHaveAttribute("data-slot", "skeleton");
    expect(fields?.children).toHaveLength(FIELD_COUNT);
    expect(navigation?.children).toHaveLength(NAVIGATION_COUNT);
  });

  it("入力欄と操作に並べる枠はすべて待機表示である", () => {
    const [, fields, navigation] = blocksOf(render(<AdminProductCreateSkeleton />).container);

    expect(
      [...(fields?.children ?? []), ...(navigation?.children ?? [])].every(
        (block) => block.getAttribute("data-slot") === "skeleton",
      ),
    ).toBe(true);
  });

  it("待機の枠を支援技術へ読ませない", () => {
    const { container } = render(<AdminProductCreateSkeleton />);

    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(within(container).queryAllByRole("generic")).toHaveLength(0);
  });

  it("a11y 検査を通る", async () => {
    const { container } = render(<AdminProductCreateSkeleton />);

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
