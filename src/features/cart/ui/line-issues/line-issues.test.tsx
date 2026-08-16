// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { CartLineIssues } from "./line-issues";

describe("CartLineIssues", () => {
  it("事情が無いとき、何も出さない", () => {
    const { container } = render(<CartLineIssues availableQuantity={null} issues={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("在庫が足りないとき、今買える数を添えて伝える", () => {
    render(<CartLineIssues availableQuantity={2} issues={["insufficientStock"]} />);

    expect(screen.getByText("在庫が 2 個までです。")).toBeVisible();
  });

  it("同時に立った事情を、畳まずに並べる", () => {
    render(
      <CartLineIssues availableQuantity={null} issues={["outOfStock", "priceIncreased"]} />, //
    );

    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("買えない事情を強い配色で出す", () => {
    render(<CartLineIssues availableQuantity={null} issues={["outOfStock"]} />);

    const [notice] = screen.getAllByRole("listitem");

    expect(notice).toHaveClass("text-destructive");
  });

  it("買えなくならない事情は同じ強さで出さない", () => {
    render(<CartLineIssues availableQuantity={null} issues={["priceIncreased"]} />);

    const [notice] = screen.getAllByRole("listitem");

    expect(notice).toHaveClass("text-muted-foreground");
  });

  it("事情が立っている行が小計に入っていないことを添える", () => {
    render(<CartLineIssues availableQuantity={null} issues={["priceIncreased"]} />);

    expect(screen.getByText("小計には含めていません。")).toBeVisible();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(
      <CartLineIssues availableQuantity={2} issues={["insufficientStock"]} />,
    );

    expect((await axe(container)).violations).toEqual([]);
  });
});
