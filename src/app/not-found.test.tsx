// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import NotFound from "./not-found";

describe("NotFound", () => {
  it("見つからなかったことを見出しで伝える", () => {
    render(<NotFound />);

    expect(screen.getByRole("heading", { name: "対象が見つかりません。" })).toBeVisible();
  });

  it("トップへ戻る導線を出す", () => {
    render(<NotFound />);

    expect(screen.getByRole("link", { name: "トップへ戻る" })).toHaveAttribute("href", "/");
  });

  it("a11y 違反を持たない", async () => {
    const { container } = render(<NotFound />);

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
