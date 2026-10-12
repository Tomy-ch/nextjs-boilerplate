// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { toProductId } from "@/model/product/product";

import { DiscontinueConfirmDialog, type DiscontinueConfirmDialogProps } from "./confirm-dialog";

const PRODUCT = {
  id: toProductId("0195f0c2-0000-7000-8000-000000000001"),
  name: "ワイヤレスイヤホン",
};
const IDEMPOTENCY_KEY = "0195f0c2-0000-7000-8000-0000000000aa";

function renderDialog(overrides: Partial<DiscontinueConfirmDialogProps> = {}) {
  const props: DiscontinueConfirmDialogProps = {
    open: true,
    onDismiss: vi.fn(),
    formAction: vi.fn(),
    product: PRODUCT,
    values: { couponDiscountRate: "12.5", couponValidityDays: "30" },
    estimatedUserCount: 1_234,
    idempotencyKey: IDEMPOTENCY_KEY,
    failures: [],
    ...overrides,
  };

  return { ...render(<DiscontinueConfirmDialog {...props} />), props };
}

describe("DiscontinueConfirmDialog", () => {
  // ----- 閉じているとき -----
  it("開いていなければ何も出さない", () => {
    renderDialog({ open: false });

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  // ----- 開いているとき -----
  it("廃番にする商品の名前を見出しにして開く", async () => {
    renderDialog();

    expect(await screen.findByRole("alertdialog")).toHaveAccessibleName(
      "ワイヤレスイヤホン を廃番にしますか？",
    );
  });

  it("取り消せないことと、カートに起きることを本文に書く", async () => {
    renderDialog();

    const dialog = await screen.findByRole("alertdialog");

    expect(within(dialog).getByText(/元に戻せません/)).toBeInTheDocument();
    expect(within(dialog).getByText(/カートに入っている明細は消えず/)).toBeInTheDocument();
  });

  it("見積もり時点の人数と、打たれたままの条件を本文に書く", async () => {
    renderDialog();

    const dialog = await screen.findByRole("alertdialog");

    expect(dialog).toHaveTextContent("見積もりの時点では 1,234 人に");
    expect(dialog).toHaveTextContent("値引き率 12.5%・有効 30 日の代替クーポン");
  });

  it("送ると、対象・冪等キー・打たれた条件・確認の合図を載せる", async () => {
    const { props } = renderDialog();

    const dialog = await screen.findByRole("alertdialog");

    await userEvent.click(within(dialog).getByRole("button", { name: "廃番にする" }));

    const sent = vi.mocked(props.formAction).mock.calls[0]?.[0];

    expect(sent?.get("productId")).toBe(PRODUCT.id);
    expect(sent?.get("idempotencyKey")).toBe(IDEMPOTENCY_KEY);
    expect(sent?.get("couponDiscountRate")).toBe("12.5");
    expect(sent?.get("couponValidityDays")).toBe("30");
    expect(sent?.get("confirmed")).toBe("true");
  });

  it("送っても自分では閉じない", async () => {
    const { props } = renderDialog();

    const dialog = await screen.findByRole("alertdialog");

    await userEvent.click(within(dialog).getByRole("button", { name: "廃番にする" }));

    expect(props.onDismiss).not.toHaveBeenCalled();
  });

  it("送っている間は、待っていることを操作自身の名前で伝えて押せなくする", async () => {
    renderDialog({ formAction: () => new Promise<void>(() => undefined) });

    const dialog = await screen.findByRole("alertdialog");

    await userEvent.click(within(dialog).getByRole("button", { name: "廃番にする" }));

    expect(await within(dialog).findByRole("button", { name: "廃番にしています…" })).toBeDisabled();
  });

  it("やめる操作は送らず、確認をやめたことだけを伝える", async () => {
    const { props } = renderDialog();

    const dialog = await screen.findByRole("alertdialog");

    await userEvent.click(within(dialog).getByRole("button", { name: "やめる" }));

    expect(props.formAction).not.toHaveBeenCalled();
    expect(props.onDismiss).toHaveBeenCalledTimes(1);
  });

  it("失敗が無ければ、失敗の報せを出さない", async () => {
    renderDialog();

    const dialog = await screen.findByRole("alertdialog");

    expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
  });

  it("直前の失敗を、確認の中に 1 つずつ出す", async () => {
    renderDialog({ failures: ["全体の文言", "値引き率は受け付けられませんでした。"] });

    const dialog = await screen.findByRole("alertdialog");
    const alert = within(dialog).getByRole("alert");

    expect(alert).toHaveTextContent("廃番にできませんでした");
    expect(within(alert).getByText("全体の文言")).toBeInTheDocument();
    expect(within(alert).getByText("値引き率は受け付けられませんでした。")).toBeInTheDocument();
  });

  it("失敗を出した状態で a11y 検査を通る", async () => {
    renderDialog({ failures: ["全体の文言"] });

    const dialog = await screen.findByRole("alertdialog");

    expect(
      (await axe(dialog, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
