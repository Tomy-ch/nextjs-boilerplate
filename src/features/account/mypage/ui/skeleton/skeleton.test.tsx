// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import {
  MypageSkeleton,
  PLACEHOLDER_ACTIONS,
  PLACEHOLDER_CARDS,
  PLACEHOLDER_ROWS,
  PLACEHOLDER_SUMMARY_ROWS,
} from "./skeleton";

describe("MypageSkeleton", () => {
  it("出来上がりと同じ枚数のカードを同時に出す", () => {
    const { container } = render(<MypageSkeleton />);

    expect(container.querySelectorAll("[data-slot=card]")).toHaveLength(PLACEHOLDER_CARDS);
  });

  it("カードごとに見出しと操作、項目ぶんの枠を並べる", () => {
    const { container } = render(<MypageSkeleton />);

    // 見出しと操作が各カードに 1 つずつ、プロフィールは項目ごとにラベルと値、サマリは行ごとに 1 つ。
    expect(container.querySelectorAll("[data-slot=skeleton]")).toHaveLength(
      PLACEHOLDER_CARDS * 2 + PLACEHOLDER_ROWS * 2 + PLACEHOLDER_SUMMARY_ROWS + PLACEHOLDER_ACTIONS,
    );
  });

  it("出来上がりと同じ器で組み、下端の操作ぶんの高さも空ける", () => {
    const { container } = render(<MypageSkeleton />);

    // 器を共有していないと、届いた瞬間に footer が押し下げられる（ADR 0101 §4）。
    expect(container.querySelectorAll("[data-slot=key-value-list]")).toHaveLength(1);
    expect(container.querySelectorAll("[data-slot=separator]")).toHaveLength(1);
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
