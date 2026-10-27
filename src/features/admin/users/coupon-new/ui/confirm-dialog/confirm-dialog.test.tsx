// @vitest-environment jsdom

import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { ISSUE_RECIPIENT } from "../../coupon-new.fixture";
import type { IssueConfirmation } from "../../issue-summary";
import { IssueConfirmDialog, type IssueConfirmDialogProps } from "./confirm-dialog";

const CONFIRMATION: IssueConfirmation = {
  fields: [
    ["expiresAt", "2026-12-31T14:59:00.000Z"],
    ["usableFrom", ""],
    ["minPurchaseAmount", "50"],
    ["discountKind", "flat"],
  ],
  summary: [
    { term: "値引き", detail: "5 ドル引き" },
    { term: "有効期限", detail: "2026/12/31 23:59" },
    { term: "最低購入額", detail: "50 ドル以上" },
  ],
};
const IDEMPOTENCY_KEY = "0195f0c2-0000-7000-a000-000000000003";

let settlePending: (() => void) | undefined;

function pendingAction() {
  const { promise, resolve } = Promise.withResolvers<void>();
  settlePending = () => resolve();

  return promise;
}

afterEach(async () => {
  await act(async () => settlePending?.());
  settlePending = undefined;
});

function renderDialog(overrides: Partial<IssueConfirmDialogProps> = {}) {
  const props: IssueConfirmDialogProps = {
    open: true,
    onDismiss: vi.fn(),
    formAction: vi.fn(),
    recipient: ISSUE_RECIPIENT,
    confirmation: CONFIRMATION,
    idempotencyKey: IDEMPOTENCY_KEY,
    failures: [],
    ...overrides,
  };

  return { ...render(<IssueConfirmDialog {...props} />), props };
}

describe("IssueConfirmDialog", () => {
  // ----- 閉じているとき -----
  it("開いていなければ何も出さない", () => {
    renderDialog({ open: false });

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  // ----- 開いているとき -----
  it("発行先の名前で、このクーポンを発行してよいかを問う見出しで開く", async () => {
    renderDialog();

    expect(await screen.findByRole("alertdialog")).toHaveAccessibleName(
      `${ISSUE_RECIPIENT.name} さんにこのクーポンを発行しますか？`,
    );
  });

  it("発行は取り消せず、無効にも変更にもできないことを本文に書く", async () => {
    renderDialog();

    expect(await screen.findByRole("alertdialog")).toHaveAccessibleDescription(
      "発行は取り消せません。発行したクーポンは無効にできず、内容も変えられません。",
    );
  });

  it("復唱を、語と値の組として渡された順に並べる", async () => {
    renderDialog();

    const dialog = await screen.findByRole("alertdialog");

    expect(
      within(dialog)
        .getAllByRole("term")
        .map((term) => term.textContent),
    ).toEqual(["値引き", "有効期限", "最低購入額"]);
    expect(
      within(dialog)
        .getAllByRole("definition")
        .map((detail) => detail.textContent),
    ).toEqual(["5 ドル引き", "2026/12/31 23:59", "50 ドル以上"]);
  });

  it("送ると、発行先・送る項目・冪等キー・確認の合図を載せる", async () => {
    const { props } = renderDialog();

    const dialog = await screen.findByRole("alertdialog");

    await userEvent.click(within(dialog).getByRole("button", { name: "発行する" }));

    expect(props.formAction).toHaveBeenCalledTimes(1);

    const sent = vi.mocked(props.formAction).mock.calls[0]?.[0];

    expect([...(sent?.entries() ?? [])]).toEqual([
      ["userId", ISSUE_RECIPIENT.id],
      ["expiresAt", "2026-12-31T14:59:00.000Z"],
      ["usableFrom", ""],
      ["minPurchaseAmount", "50"],
      ["discountKind", "flat"],
      ["idempotencyKey", IDEMPOTENCY_KEY],
      ["confirmed", "true"],
    ]);
  });

  it("送っても自分では閉じない", async () => {
    const { props } = renderDialog();

    const dialog = await screen.findByRole("alertdialog");

    await userEvent.click(within(dialog).getByRole("button", { name: "発行する" }));

    expect(props.onDismiss).not.toHaveBeenCalled();
  });

  it("やめる操作は送らず、確認をやめたことだけを伝える", async () => {
    const { props } = renderDialog();

    const dialog = await screen.findByRole("alertdialog");

    await userEvent.click(within(dialog).getByRole("button", { name: "やめる" }));

    expect(props.formAction).not.toHaveBeenCalled();
    expect(props.onDismiss).toHaveBeenCalledTimes(1);
  });

  it("Escape で閉じようとしたときも、送らずに確認をやめたことを伝える", async () => {
    const { props } = renderDialog();

    await screen.findByRole("alertdialog");
    await userEvent.keyboard("{Escape}");

    expect(props.formAction).not.toHaveBeenCalled();
    expect(props.onDismiss).toHaveBeenCalledTimes(1);
  });

  it("開いた状態で a11y 検査を通る", async () => {
    renderDialog();

    const dialog = await screen.findByRole("alertdialog");

    expect(
      (await axe(dialog, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });

  // ----- 送っている間 -----
  it("送っている間は、待っていることを操作自身の名前で伝えて押せなくする", async () => {
    renderDialog({ formAction: pendingAction });

    const dialog = await screen.findByRole("alertdialog");

    await userEvent.click(within(dialog).getByRole("button", { name: "発行する" }));

    expect(await within(dialog).findByRole("button", { name: "発行しています…" })).toBeDisabled();
  });

  // ----- 失敗を返されたとき -----
  it("失敗が無ければ、失敗の報せを出さない", async () => {
    renderDialog();

    const dialog = await screen.findByRole("alertdialog");

    expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
  });

  it("直前の失敗を、1 つの報せの中に 1 つずつ出す", async () => {
    renderDialog({ failures: ["全体の文言", "対象の組み合わせを確認してください。"] });

    const dialog = await screen.findByRole("alertdialog");
    const alert = within(dialog).getByRole("alert");

    expect(within(dialog).getAllByRole("alert")).toHaveLength(1);
    expect(alert).toHaveTextContent("発行できませんでした");
    expect(within(alert).getByText("全体の文言")).toBeInTheDocument();
    expect(within(alert).getByText("対象の組み合わせを確認してください。")).toBeInTheDocument();
  });

  it("失敗を出した状態で a11y 検査を通る", async () => {
    renderDialog({ failures: ["全体の文言"] });

    const dialog = await screen.findByRole("alertdialog");

    expect(
      (await axe(dialog, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
