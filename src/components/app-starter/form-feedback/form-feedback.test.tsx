// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import Link from "next/link";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { FormFeedback } from "./form-feedback";

describe("FormFeedback", () => {
  it("要約、説明、request ID、次の行動を表示する", () => {
    render(
      <FormFeedback description="再試行してください。" requestId="req_001" title="失敗しました">
        <Link href="/">確認する</Link>
      </FormFeedback>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("失敗しました");
    expect(screen.getByText(/req_001/)).toBeVisible();
    expect(screen.getByRole("link", { name: "確認する" })).toHaveAttribute("href", "/");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<FormFeedback title="保存しました" />);
    expect((await axe(container)).violations).toEqual([]);
  });
});
