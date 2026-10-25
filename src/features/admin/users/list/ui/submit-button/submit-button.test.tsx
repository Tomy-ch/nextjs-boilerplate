// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { WithdrawSubmitButton } from "./submit-button";

describe("WithdrawSubmitButton", () => {
  it("押せる状態では、退会の呼び名を出す", () => {
    render(
      <form>
        <WithdrawSubmitButton />
      </form>,
    );

    expect(screen.getByRole("button", { name: "退会させる" })).toBeEnabled();
  });

  it("送信中は、待っていることを操作自身の名前で伝える", async () => {
    // 解決しない送信で、送信中の姿を保つ。
    const pending = () => new Promise<void>(() => undefined);

    render(
      <form action={pending}>
        <WithdrawSubmitButton />
      </form>,
    );

    await userEvent.click(screen.getByRole("button", { name: "退会させる" }));

    expect(await screen.findByRole("button", { name: "退会させています…" })).toBeDisabled();
  });

  it("form の送信として振る舞う", () => {
    render(
      <form>
        <WithdrawSubmitButton />
      </form>,
    );

    expect(screen.getByRole("button", { name: "退会させる" })).toHaveAttribute("type", "submit");
  });

  it("a11y 検査を通る", async () => {
    const { container } = render(
      <form>
        <WithdrawSubmitButton />
      </form>,
    );

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
