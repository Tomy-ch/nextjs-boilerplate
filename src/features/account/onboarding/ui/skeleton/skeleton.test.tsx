// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { OnboardingSkeleton } from "./skeleton";

/** 待機表示の外枠の直下に並ぶ塊。進捗・入力の行・操作の並びに分かれる。 */
function blocksOf(container: HTMLElement): readonly Element[] {
  return [...(container.firstElementChild?.children ?? [])];
}

describe("OnboardingSkeleton", () => {
  // ----- 正常系 -----
  it("進捗に並ぶ段の数だけ枠を出す", () => {
    const { container } = render(<OnboardingSkeleton />);
    const [progress] = blocksOf(container);

    expect(progress?.children).toHaveLength(3);
  });

  it("最初の段が尋ねる項目の数だけ入力の行を出す", () => {
    const { container } = render(<OnboardingSkeleton />);

    expect(blocksOf(container).slice(1, -1)).toHaveLength(4);
  });

  it("段を進める操作の分も場所を取る", () => {
    const { container } = render(<OnboardingSkeleton />);

    expect(blocksOf(container).at(-1)?.children).toHaveLength(2);
  });

  it("待機であることを支援技術へ読ませない", () => {
    const { container } = render(<OnboardingSkeleton />);

    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<OnboardingSkeleton />);

    expect((await axe(container)).violations).toEqual([]);
  });
});
