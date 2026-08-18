// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { failedActionState, idleActionState, succeededActionState } from "@/model/action-state";

import { PlaceOrderError, PlaceOrderSubmit } from "./place-order-submit";

describe("PlaceOrderSubmit", () => {
  // ----- 正常系 -----
  it("受け取った文言で送信する操作を出す", () => {
    render(
      <form>
        <PlaceOrderSubmit label="注文を確定する" orderable />
      </form>,
    );

    const submit = screen.getByRole("button", { name: "注文を確定する" });

    expect(submit).toHaveAttribute("type", "submit");
    expect(submit).toBeEnabled();
  });

  it("幅を占めるかどうかを呼び出し元が決める", () => {
    render(
      <form>
        <PlaceOrderSubmit fullWidth label="注文を確定する" orderable />
      </form>,
    );

    expect(screen.getByRole("button", { name: "注文を確定する" })).toHaveClass("w-full");
  });

  it("送っている間は、押せなくしたうえで進行を読み上げる", async () => {
    const user = userEvent.setup();
    let settle: (() => void) | undefined;
    const pendingAction = () =>
      new Promise<void>((resolve) => {
        settle = resolve;
      });

    render(
      <form action={pendingAction}>
        <PlaceOrderSubmit label="注文を確定する" orderable />
      </form>,
    );
    await user.click(screen.getByRole("button", { name: "注文を確定する" }));

    expect(await screen.findByRole("button", { name: "注文を確定しています" })).toBeDisabled();

    settle?.();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "注文を確定する" })).toBeEnabled(),
    );
  });

  // ----- 異常系 -----
  it("確定できる明細が無ければ押せない", () => {
    render(
      <form>
        <PlaceOrderSubmit label="注文を確定する" orderable={false} />
      </form>,
    );

    expect(screen.getByRole("button", { name: "注文を確定する" })).toBeDisabled();
  });
});

describe("PlaceOrderError", () => {
  // ----- 正常系 -----
  it("失敗の理由を出す", () => {
    render(<PlaceOrderError state={failedActionState({ formError: "在庫が変わりました。" })} />);

    expect(screen.getByText("在庫が変わりました。")).toBeVisible();
    expect(screen.getByText("注文を確定できませんでした")).toBeVisible();
  });

  // ----- 異常系 -----
  it("まだ送っていない状態では何も出さない", () => {
    const { container } = render(<PlaceOrderError state={idleActionState()} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("成立した状態では何も出さない", () => {
    const { container } = render(<PlaceOrderError state={succeededActionState(undefined)} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("理由の無い失敗では何も出さない", () => {
    const { container } = render(<PlaceOrderError state={failedActionState()} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(
      <PlaceOrderError state={failedActionState({ formError: "在庫が変わりました。" })} />,
    );

    expect((await axe(container)).violations).toEqual([]);
  });
});
