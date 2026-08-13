// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { SectionFailure } from "./section-failure";

describe("SectionFailure", () => {
  // ----- 正常系 -----
  it("落ちた節の名前を見出しに含める", () => {
    render(<SectionFailure label="売上ランキング" message="失敗しました。" />);

    expect(screen.getByText("売上ランキングを表示できませんでした")).toBeVisible();
  });

  it("分類から引いた文言を示す", () => {
    render(<SectionFailure label="新着商品" message="現在サービスを利用できません。" />);

    expect(screen.getByText("現在サービスを利用できません。")).toBeVisible();
  });

  it("再読み込みの操作を持たない", () => {
    render(<SectionFailure label="新着商品" message="失敗しました。" />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("a11y 違反が無い", async () => {
    const { container } = render(<SectionFailure label="新着商品" message="失敗しました。" />);

    expect((await axe(container)).violations).toEqual([]);
  });
});
