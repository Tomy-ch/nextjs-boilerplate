// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PrintButton } from "./print-button";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("PrintButton", () => {
  // ----- 正常系 -----
  it("押すと印刷を始める", async () => {
    const print = vi.fn();

    vi.stubGlobal("print", print);
    render(<PrintButton />);

    await userEvent.click(screen.getByRole("button", { name: "印刷する" }));

    expect(print).toHaveBeenCalledOnce();
  });

  it("押すまでは印刷を始めない", () => {
    const print = vi.fn();

    vi.stubGlobal("print", print);
    render(<PrintButton />);

    expect(print).not.toHaveBeenCalled();
  });

  it("自分自身は紙へ出さない", () => {
    render(<PrintButton />);

    expect(screen.getByRole("button", { name: "印刷する" })).toHaveClass("print-hidden");
  });
});
