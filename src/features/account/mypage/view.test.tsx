// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import {
  EMPTY_PURCHASE_HISTORY,
  EMPTY_PURCHASE_SUMMARY,
  PROFILE,
  PURCHASE_HISTORY,
  PURCHASE_SUMMARY,
} from "../account.fixture";
import { MypageView } from "./view";

function renderView(overrides: Partial<Parameters<typeof MypageView>[0]> = {}) {
  return render(
    <MypageView
      profile={PROFILE}
      purchases={PURCHASE_HISTORY}
      summary={PURCHASE_SUMMARY}
      {...overrides}
    />,
  );
}

describe("MypageView", () => {
  it("登録情報と購入の集計を読むための 2 枚として並べる", () => {
    renderView();

    expect(screen.getByText("プロフィール")).toBeVisible();
    expect(screen.getByText("購入サマリ")).toBeVisible();
  });

  it("受け取ったプロフィールをカードへ渡す", () => {
    renderView();

    expect(screen.getByText("山田 太郎")).toBeVisible();
  });

  it("受け取った集計をカードへ渡す", () => {
    renderView();

    expect(screen.getByRole("row", { name: /合計/ })).toHaveTextContent("11 件");
  });

  it("受け取った履歴を集計のカードへ渡す", () => {
    renderView();

    expect(screen.getByRole("button", { name: "もっと見る" })).toBeEnabled();
  });

  it("戻せない操作を読むための内容と同じ格に並べない", () => {
    renderView();

    expect(
      screen.getByRole("navigation", { name: "このサイトについての案内と退会" }),
    ).toBeVisible();
  });

  it("購入が無くても登録情報と操作を出す", () => {
    renderView({ purchases: EMPTY_PURCHASE_HISTORY, summary: EMPTY_PURCHASE_SUMMARY });

    expect(screen.getByText("まだ購入がありません。")).toBeVisible();
    expect(screen.getByText("山田 太郎")).toBeVisible();
    expect(screen.getByRole("button", { name: "退会する" })).toBeVisible();
  });

  // jsdom は media query を評価しないので、ここで固定できるのは class の付与までである。
  // 実際にその幅でどう見えるかは VRT が持つ。
  it("段を 3 列以上へ広げない class を持つ", () => {
    const { container } = renderView();

    expect(container.querySelector(".grid")).toHaveClass("lg:grid-cols-2");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = renderView();

    expect((await axe(container)).violations).toEqual([]);
  });
});
