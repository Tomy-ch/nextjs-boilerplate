// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import AdminNotFound from "./not-found";

describe("AdminNotFound", () => {
  it("見つからなかったことを見出しで伝える", () => {
    render(<AdminNotFound />);

    expect(screen.getByRole("heading", { name: "対象が見つかりません。" })).toBeVisible();
  });

  it("管理のダッシュボードへ戻る導線を出す", () => {
    render(<AdminNotFound />);

    expect(screen.getByRole("link", { name: "ダッシュボードへ戻る" })).toHaveAttribute(
      "href",
      "/admin",
    );
  });

  it("a11y 違反を持たない", async () => {
    const { container } = render(<AdminNotFound />);

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
