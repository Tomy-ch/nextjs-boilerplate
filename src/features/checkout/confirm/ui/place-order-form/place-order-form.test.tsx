// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

vi.mock("../../../actions", () => ({ placeOrderAction: vi.fn() }));

import { IDEMPOTENCY_KEY_FIELD } from "../../../idempotency-key";
import { PlaceOrderForm } from "./place-order-form";

const KEY = "0195f0c2-0000-7000-a000-000000000001";

describe("PlaceOrderForm", () => {
  // ----- 正常系 -----
  it("確定の操作を出す", () => {
    render(<PlaceOrderForm idempotencyKey={KEY} orderable />);

    expect(screen.getByRole("button", { name: "注文を確定する" })).toBeEnabled();
  });

  it("画面が組んだ鍵を送信へ載せる", () => {
    const { container } = render(<PlaceOrderForm idempotencyKey={KEY} orderable />);

    expect(container.querySelector(`input[name="${IDEMPOTENCY_KEY_FIELD}"]`)).toHaveValue(KEY);
  });

  it("確かめを挟まない", () => {
    render(<PlaceOrderForm idempotencyKey={KEY} orderable />);

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  // ----- 異常系 -----
  it("確定できる明細が無ければ押せない", () => {
    render(<PlaceOrderForm idempotencyKey={KEY} orderable={false} />);

    expect(screen.getByRole("button", { name: "注文を確定する" })).toBeDisabled();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<PlaceOrderForm idempotencyKey={KEY} orderable />);

    expect((await axe(container)).violations).toEqual([]);
  });
});
