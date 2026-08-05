// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./button";
import { BUTTON_VARIANT } from "./button.definition";

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
});
