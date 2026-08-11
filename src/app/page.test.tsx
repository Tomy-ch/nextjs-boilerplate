// @vitest-environment jsdom

// このテストは、Next.js 規定の初期画面を表示するだけの簡易テストであり、将来的に破棄する予定のものです。

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import Home from "./page";

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => (
    <span role="img" aria-label={alt}>
      {alt}
    </span>
  ),
}));

describe("Home", () => {
  // ----- 正常系 -----
  it("初期画面に開始案内と主要リンクを表示する", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { name: "To get started, edit the page.tsx file." }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: /Deploy Now/ })).toHaveAttribute(
      "href",
      expect.stringContaining("vercel.com/new"),
    );
    expect(screen.getByRole("link", { name: "Documentation" })).toHaveAttribute(
      "href",
      expect.stringContaining("nextjs.org/docs"),
    );
  });

  it("初期画面に自動検査可能なアクセシビリティ違反がない", async () => {
    const { container } = render(<Home />);

    const result = await axe(container, { rules: { "color-contrast": { enabled: false } } });

    expect(result.violations).toEqual([]);
  });
});
