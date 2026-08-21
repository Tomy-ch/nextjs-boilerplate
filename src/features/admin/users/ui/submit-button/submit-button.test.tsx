// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

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
    render(
      <form action={() => new Promise(() => undefined)}>
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
});
