// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Spinner } from "./spinner";

describe("Spinner", () => {
  it("既定では装飾として扱い、支援技術へ何も伝えない", () => {
    const { container } = render(<Spinner />);

    const spinner = container.querySelector("[data-slot='spinner']");

    expect(spinner).toHaveAttribute("aria-hidden", "true");
    expect(spinner).not.toHaveAttribute("role");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("label を指定すると status として文言を読み上げ対象にする", () => {
    render(<Spinner label="読み込んでいます" />);

    const status = screen.getByRole("status");

    expect(status).toHaveAccessibleName("読み込んでいます");
    expect(status).not.toHaveAttribute("aria-hidden");
  });

  it("reduced motion では回転を停止する", () => {
    const { container } = render(<Spinner />);

    expect(container.querySelector("[data-slot='spinner']")).toHaveClass(
      "animate-spin",
      "motion-reduce:animate-none",
    );
  });

  it("className で大きさを上書きできる", () => {
    const { container } = render(<Spinner className="size-8" />);

    expect(container.querySelector("[data-slot='spinner']")).toHaveClass("size-8");
  });

  it("装飾として使う場合に a11y 自動検査に違反しない", async () => {
    const { container } = render(
      <span>
        <Spinner />
        送信中
      </span>,
    );

    const result = await axe(container, { rules: { "color-contrast": { enabled: false } } });

    expect(result.violations).toEqual([]);
  });

  it("label を付けた場合に a11y 自動検査に違反しない", async () => {
    const { container } = render(<Spinner label="読み込んでいます" />);

    const result = await axe(container, { rules: { "color-contrast": { enabled: false } } });

    expect(result.violations).toEqual([]);
  });
});
