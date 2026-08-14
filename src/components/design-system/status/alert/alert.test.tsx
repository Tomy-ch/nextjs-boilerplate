// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Alert, AlertDescription, AlertTitle } from "./alert";

function AlertFixture({ destructive = false }: { destructive?: boolean }) {
  return (
    <Alert variant={destructive ? "destructive" : "default"}>
      <AlertTitle>確認が必要です</AlertTitle>
      <AlertDescription>内容を確認してから次へ進んでください。</AlertDescription>
    </Alert>
  );
}

describe("Alert", () => {
  it("alert の意味論と通知内容を表示する", () => {
    render(<AlertFixture />);

    expect(screen.getByRole("alert")).toHaveAttribute("data-slot", "alert");
    expect(screen.getByText("確認が必要です")).toHaveAttribute("data-slot", "alert-title");
    expect(screen.getByText("内容を確認してから次へ進んでください。")).toHaveAttribute(
      "data-slot",
      "alert-description",
    );
  });

  it("destructive variant を適用する", () => {
    render(<AlertFixture destructive />);

    expect(screen.getByRole("alert")).toHaveClass("bg-destructive/10");
  });

  it("warning variant を適用する", () => {
    render(<Alert variant="warning">注意</Alert>);

    expect(screen.getByRole("alert")).toHaveClass("bg-warning/10");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<AlertFixture />);

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});

describe("AlertTitle", () => {
  it("見出しとして slot を持つ要素を描画する", () => {
    render(<AlertTitle>確認が必要です</AlertTitle>);

    expect(screen.getByText("確認が必要です")).toHaveAttribute("data-slot", "alert-title");
  });

  it("呼び出し側の class を既定の指定へ足す", () => {
    render(<AlertTitle className="mt-2">確認が必要です</AlertTitle>);

    expect(screen.getByText("確認が必要です")).toHaveClass("mt-2");
  });
});

describe("AlertDescription", () => {
  it("本文として slot を持つ要素を描画する", () => {
    render(<AlertDescription>内容を確認してください。</AlertDescription>);

    expect(screen.getByText("内容を確認してください。")).toHaveAttribute(
      "data-slot",
      "alert-description",
    );
  });

  it("呼び出し側の class を既定の指定へ足す", () => {
    render(<AlertDescription className="mt-2">内容を確認してください。</AlertDescription>);

    expect(screen.getByText("内容を確認してください。")).toHaveClass("mt-2");
  });
});
