// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CartCount } from "./count";

describe("CartCount", () => {
  it("入っている点数を数字で出す", () => {
    render(<CartCount count={3} />);

    expect(screen.getByText("3")).toBeVisible();
  });

  it("0 点のときは数字を出さない", () => {
    render(<CartCount count={0} />);

    expect(screen.queryByText("0")).not.toBeInTheDocument();
    expect(screen.getByText("カート")).toBeVisible();
  });
});
