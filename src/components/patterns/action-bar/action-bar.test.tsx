// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { ActionBar } from "./action-bar";
import { ACTION_BAR_POSITION } from "./action-bar.definition";

describe("ActionBar", () => {
  it("渡した操作を並べる", () => {
    render(
      <ActionBar>
        <button type="button">保存</button>
      </ActionBar>,
    );

    expect(screen.getByRole("button", { name: "保存" })).toBeVisible();
  });

  it("既定では本文の流れの中に置く", () => {
    const { container } = render(<ActionBar>内容</ActionBar>);

    expect(container.querySelector("[data-slot=action-bar]")).toHaveAttribute(
      "data-position",
      "inline",
    );
  });

  it("下端に固定する位置では overlay より下の重なり順にする", () => {
    const { container } = render(<ActionBar position={ACTION_BAR_POSITION.FIXED}>内容</ActionBar>);

    expect(container.querySelector("[data-slot=action-bar]")).toHaveClass("fixed", "z-40");
  });

  it("下端に固定する位置ではホームバーを避ける余白を持つ", () => {
    const { container } = render(<ActionBar position={ACTION_BAR_POSITION.FIXED}>内容</ActionBar>);

    expect(container.querySelector("[data-slot=action-bar]")?.className).toContain(
      "env(safe-area-inset-bottom)",
    );
  });

  it("脇に領域を持てる幅では流れの中へ戻す位置を選べる", () => {
    const { container } = render(
      <ActionBar position={ACTION_BAR_POSITION.FIXED_WITHOUT_ASIDE}>内容</ActionBar>,
    );

    expect(container.querySelector("[data-slot=action-bar]")).toHaveClass("fixed", "lg:static");
  });

  it("呼び出し側の class を足せる", () => {
    const { container } = render(<ActionBar className="justify-end">内容</ActionBar>);

    expect(container.querySelector("[data-slot=action-bar]")).toHaveClass("justify-end");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(
      <ActionBar position={ACTION_BAR_POSITION.FIXED}>
        <button type="button">保存</button>
      </ActionBar>,
    );

    expect((await axe(container)).violations).toEqual([]);
  });
});
