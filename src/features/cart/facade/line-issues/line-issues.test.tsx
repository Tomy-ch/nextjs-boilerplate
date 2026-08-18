// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { CartLineIssues } from "./line-issues";

/** 画面が足す一文。この部品は受け取った文をそのまま最後に置く。 */
const NOTE = "小計には含めていません。";

describe("CartLineIssues", () => {
  it("事情が無いとき、何も出さない", () => {
    const { container } = render(
      <CartLineIssues availableQuantity={null} issues={[]} note={NOTE} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("在庫が足りないとき、今買える数を添えて伝える", () => {
    render(<CartLineIssues availableQuantity={2} issues={["insufficientStock"]} note={NOTE} />);

    expect(screen.getByText("在庫が 2 個までです。")).toBeVisible();
  });

  it("同時に立った事情を、畳まずに並べる", () => {
    render(
      <CartLineIssues
        availableQuantity={null}
        issues={["outOfStock", "priceIncreased"]}
        note={NOTE}
      />, //
    );

    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("買えない事情を強い配色で出す", () => {
    render(<CartLineIssues availableQuantity={null} issues={["outOfStock"]} note={NOTE} />);

    const [notice] = screen.getAllByRole("listitem");

    expect(notice).toHaveClass("text-destructive");
  });

  it("値が変わった事情は、買えない事情とは別の強さで出す", () => {
    render(<CartLineIssues availableQuantity={null} issues={["priceIncreased"]} note={NOTE} />);

    const [notice] = screen.getAllByRole("listitem");

    expect(notice).toHaveClass("text-warning");
  });

  it("画面が渡した一文を、事情の後に添える", () => {
    render(<CartLineIssues availableQuantity={null} issues={["priceIncreased"]} note={NOTE} />);

    expect(screen.getByText(NOTE)).toBeVisible();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(
      <CartLineIssues availableQuantity={2} issues={["insufficientStock"]} note={NOTE} />,
    );

    expect((await axe(container)).violations).toEqual([]);
  });
});
