// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CartSubtotal } from "./subtotal";

describe("CartSubtotal", () => {
  it("小計を locale の書式で出す", () => {
    render(<CartSubtotal amount={18897} />);

    expect(screen.getByText("小計")).toBeVisible();
    expect(screen.getByText("$188.97")).toBeVisible();
  });

  it("0 でも金額として出す", () => {
    render(<CartSubtotal amount={0} />);

    expect(screen.getByText("$0.00")).toBeVisible();
  });

  it("大きさを渡さないとき、金額を主役の大きさで出す", () => {
    render(<CartSubtotal amount={100} />);

    expect(screen.getByText("$1.00")).toHaveClass("text-2xl");
  });

  it("控えめな大きさを指定できる", () => {
    render(<CartSubtotal amount={100} size="compact" />);

    expect(screen.getByText("$1.00")).toHaveClass("text-lg");
  });
});
