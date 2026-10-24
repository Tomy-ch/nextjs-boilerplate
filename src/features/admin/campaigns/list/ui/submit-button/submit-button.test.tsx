// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { SuspendSubmitButton } from "./submit-button";

describe("SuspendSubmitButton", () => {
  // ----- 送る前 -----
  it("押せる状態で、停止の呼び名を出す", () => {
    render(
      <form>
        <SuspendSubmitButton />
      </form>,
    );

    expect(screen.getByRole("button", { name: "停止する" })).toBeEnabled();
  });

  it("form の送信として振る舞う", () => {
    render(
      <form>
        <SuspendSubmitButton />
      </form>,
    );

    expect(screen.getByRole("button", { name: "停止する" })).toHaveAttribute("type", "submit");
  });

  // ----- 送信中 -----
  it("送信中は、待っていることを操作自身の名前で伝え、押せなくする", async () => {
    const pending = () => new Promise<void>(() => undefined);

    render(
      <form action={pending}>
        <SuspendSubmitButton />
      </form>,
    );

    await userEvent.click(screen.getByRole("button", { name: "停止する" }));

    expect(await screen.findByRole("button", { name: "停止しています…" })).toBeDisabled();
  });

  it("a11y 検査を通る", async () => {
    const { container } = render(
      <form>
        <SuspendSubmitButton />
      </form>,
    );

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
