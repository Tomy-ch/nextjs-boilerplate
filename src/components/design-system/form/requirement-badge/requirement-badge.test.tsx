// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { RequirementBadge } from "./requirement-badge";

describe("RequirementBadge", () => {
  it("必須の項目に必須の印を出す", () => {
    render(<RequirementBadge required />);

    expect(screen.getByText("必須")).toBeVisible();
  });

  it("任意の項目にも印を出し、無印にしない", () => {
    render(<RequirementBadge required={false} />);

    expect(screen.getByText("任意")).toBeVisible();
  });

  it("必須と任意を同時に出さない", () => {
    render(<RequirementBadge required />);

    expect(screen.queryByText("任意")).not.toBeInTheDocument();
  });

  it("印を読み上げから外す", () => {
    render(<RequirementBadge required />);

    expect(screen.getByText("必須")).toHaveAttribute("aria-hidden", "true");
  });

  it("誤りの表示と同じ強さにならないよう塗りつぶさない", () => {
    render(<RequirementBadge required />);

    expect(screen.getByText("必須")).toHaveClass("bg-destructive/10", "text-destructive");
  });

  it("任意の印を注意を引かない色にする", () => {
    render(<RequirementBadge required={false} />);

    expect(screen.getByText("任意")).toHaveClass("text-muted-foreground");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<RequirementBadge required />);

    expect((await axe(container)).violations).toEqual([]);
  });
});
