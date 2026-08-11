// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import NotFound from "./not-found";

describe("NotFound", () => {
  // ----- 正常系 -----
  it("見つからなかったことを見出しで伝える", () => {
    render(<NotFound />);

    expect(screen.getByRole("heading", { name: "対象が見つかりません。" })).toBeVisible();
  });

  it("トップへ戻る導線を出す", () => {
    render(<NotFound />);

    expect(screen.getByRole("link", { name: "トップへ戻る" })).toHaveAttribute("href", "/");
  });
});
