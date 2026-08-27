// @vitest-environment jsdom

import { render, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { AdminProductEditSkeleton } from "./skeleton";

/** 入力欄の枠の数。`skeleton.tsx` の `PLACEHOLDER_FIELDS` と揃える。 */
const FIELD_COUNT = 4;

/** 待機表示の 3 つの区画。観点の切り替え・入力欄・送信の順に並ぶ。 */
function blocksOf(container: HTMLElement): readonly Element[] {
  return [...(container.firstElementChild?.children ?? [])];
}

describe("AdminProductEditSkeleton", () => {
  it("観点の切り替え・入力欄・送信を、この順で出す", () => {
    const [switcher, fields, submit] = blocksOf(render(<AdminProductEditSkeleton />).container);

    expect(switcher).toHaveAttribute("data-slot", "skeleton");
    expect(fields?.children).toHaveLength(FIELD_COUNT);
    expect(submit).toHaveAttribute("data-slot", "skeleton");
  });

  it("入力欄に並べる枠はすべて待機表示である", () => {
    const [, fields] = blocksOf(render(<AdminProductEditSkeleton />).container);

    expect(
      [...(fields?.children ?? [])].every(
        (field) => field.getAttribute("data-slot") === "skeleton",
      ),
    ).toBe(true);
  });

  it("待機の枠を支援技術へ読ませない", () => {
    const { container } = render(<AdminProductEditSkeleton />);

    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(within(container).queryAllByRole("generic")).toHaveLength(0);
  });

  it("a11y 検査を通る", async () => {
    const { container } = render(<AdminProductEditSkeleton />);

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
