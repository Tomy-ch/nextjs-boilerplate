// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

vi.mock("../../../actions", () => ({ placeOrderAction: vi.fn() }));

import { ACCEPT_PRICE_CHANGE_FIELD, IDEMPOTENCY_KEY_FIELD } from "../../../idempotency-key";
import { PriceChangeConfirm } from "./price-change-confirm";

const KEY = "0195f0c2-0000-7000-a000-000000000001";
const NAMES = ["ノイズキャンセリングヘッドホン"];

function renderConfirm(orderable = true) {
  return render(
    <PriceChangeConfirm changedNames={NAMES} idempotencyKey={KEY} orderable={orderable} />,
  );
}

async function open() {
  await userEvent.click(screen.getByRole("button", { name: "注文を確定する" }));
}

describe("PriceChangeConfirm", () => {
  it("押すまで確かめを出さない", () => {
    renderConfirm();

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("押すと、金額が変わったことと対象を出す", async () => {
    renderConfirm();

    await open();

    expect(screen.getByRole("alertdialog", { name: "金額が変わっています" })).toBeVisible();
    expect(screen.getByText(NAMES[0] ?? "")).toBeVisible();
  });

  it("出口を 3 つ置く", async () => {
    renderConfirm();

    await open();

    expect(screen.getByRole("button", { name: "はい" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "確認へ戻る" })).toBeEnabled();
    expect(screen.getByRole("link", { name: "カートを修正する" })).toHaveAttribute("href", "/cart");
  });

  it("承知の合図と鍵を、確かめの中の送信へ載せる", async () => {
    renderConfirm();

    await open();

    const dialog = screen.getByRole("alertdialog");

    expect(dialog.querySelector(`input[name="${ACCEPT_PRICE_CHANGE_FIELD}"]`)).toHaveValue("1");
    expect(dialog.querySelector(`input[name="${IDEMPOTENCY_KEY_FIELD}"]`)).toHaveValue(KEY);
  });

  it("閉じるだけの操作で確かめから戻れる", async () => {
    renderConfirm();

    await open();
    await userEvent.click(screen.getByRole("button", { name: "確認へ戻る" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
  it("確定できる明細が無ければ、確かめを開けない", () => {
    renderConfirm(false);

    expect(screen.getByRole("button", { name: "注文を確定する" })).toBeDisabled();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = renderConfirm();

    await open();

    expect((await axe(container)).violations).toEqual([]);
  });
});
