// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { Button, buttonVariants } from "./button";
import { BUTTON_SIZE, BUTTON_VARIANT } from "./button.definition";

describe("Button", () => {
  it("既定の操作ボタンを表示する", () => {
    render(<Button>保存する</Button>);

    expect(screen.getByRole("button", { name: "保存する" })).toBeVisible();
  });

  it("asChild で子要素にボタンの表現を付与する", () => {
    render(
      <Button asChild variant={BUTTON_VARIANT.OUTLINE}>
        <a href="https://github.com/">設定へ進む</a>
      </Button>,
    );

    expect(screen.getByRole("link", { name: "設定へ進む" })).toHaveAttribute(
      "href",
      "https://github.com/",
    );
  });

  it("disabled のときは操作を受け付けない", () => {
    const onClick = vi.fn();

    render(
      <Button disabled onClick={onClick}>
        保存する
      </Button>,
    );
    fireEvent.click(screen.getByRole("button", { name: "保存する" }));

    expect(screen.getByRole("button", { name: "保存する" })).toBeDisabled();
    expect(onClick).not.toHaveBeenCalled();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<Button>保存する</Button>);

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});

describe("buttonVariants", () => {
  // ----- 正常系 -----
  it("既定の見た目の class を返す", () => {
    expect(buttonVariants()).toContain("inline-flex");
  });

  it("variant と size の指定を class へ反映する", () => {
    expect(buttonVariants({ variant: BUTTON_VARIANT.OUTLINE })).not.toBe(buttonVariants());
    expect(buttonVariants({ size: BUTTON_SIZE.SMALL })).not.toBe(buttonVariants());
  });
});
