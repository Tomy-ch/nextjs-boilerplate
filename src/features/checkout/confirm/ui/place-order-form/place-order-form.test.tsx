// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

vi.mock("../../../actions", () => ({ placeOrderAction: vi.fn() }));

import { IDEMPOTENCY_KEY_FIELD } from "@/model/idempotency-key";
import { PlaceOrderStateProvider } from "../place-order-state/place-order-state";
import { PlaceOrderForm } from "./place-order-form";

const KEY = "0195f0c2-0000-7000-a000-000000000001";
const OTHER_KEY = "0195f0c2-0000-7000-a000-000000000002";

/** 送信の状態は器が持つ。鍵を差し替えて描き直せるよう、器ごと組み立てる。 */
function renderForm(orderable = true, idempotencyKey = KEY) {
  return render(
    <PlaceOrderStateProvider idempotencyKey={idempotencyKey}>
      <PlaceOrderForm orderable={orderable} />
    </PlaceOrderStateProvider>,
  );
}

describe("PlaceOrderForm", () => {
  it("確定の操作を出す", () => {
    renderForm();

    expect(screen.getByRole("button", { name: "注文を確定する" })).toBeEnabled();
  });

  it("画面が組んだ鍵を送信へ載せる", () => {
    const { container } = renderForm();

    expect(container.querySelector(`input[name="${IDEMPOTENCY_KEY_FIELD}"]`)).toHaveValue(KEY);
  });

  it("組み直された画面から別の鍵が届いても、送信へ載せる鍵は変えない", () => {
    const { container, rerender } = renderForm();

    rerender(
      <PlaceOrderStateProvider idempotencyKey={OTHER_KEY}>
        <PlaceOrderForm orderable />
      </PlaceOrderStateProvider>,
    );

    expect(container.querySelector(`input[name="${IDEMPOTENCY_KEY_FIELD}"]`)).toHaveValue(KEY);
  });

  it("確かめを挟まない", () => {
    renderForm();

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
  it("確定できる明細が無ければ押せない", () => {
    renderForm(false);

    expect(screen.getByRole("button", { name: "注文を確定する" })).toBeDisabled();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = renderForm();

    expect((await axe(container)).violations).toEqual([]);
  });
});
