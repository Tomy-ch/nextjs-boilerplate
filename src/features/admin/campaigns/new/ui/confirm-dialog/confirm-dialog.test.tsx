// @vitest-environment jsdom

import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import type { CampaignConfirmation } from "../../campaign-summary";
import { CampaignConfirmDialog, type CampaignConfirmDialogProps } from "./confirm-dialog";

const CONFIRMATION: CampaignConfirmation = {
  fields: [
    ["code", "welcome-2026"],
    ["discountKind", "rate"],
    ["discountMaxAmount", "20"],
  ],
  summary: [
    { term: "キャンペーンコード", detail: "WELCOME-2026" },
    { term: "値引き", detail: "15% 引き（1 回 20 ドルまで）" },
    { term: "最低購入額", detail: "なし" },
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

function renderDialog(overrides: Partial<CampaignConfirmDialogProps> = {}) {
  const props: CampaignConfirmDialogProps = {
    open: true,
    onDismiss: vi.fn(),
    formAction: vi.fn(),
    confirmation: CONFIRMATION,
    idempotencyKey: IDEMPOTENCY_KEY,
    failures: [],
    ...overrides,
  };

  return { ...render(<CampaignConfirmDialog {...props} />), props };
}

describe("CampaignConfirmDialog", () => {
  // ----- 閉じているとき -----
  it("開いていなければ何も出さない", () => {
    renderDialog({ open: false });

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  // ----- 開いているとき -----
  it("定義してよいかを問う見出しで開く", async () => {
    renderDialog();

    expect(await screen.findByRole("alertdialog")).toHaveAccessibleName(
      "この内容でキャンペーンを定義しますか？",
    );
  });

  it("定義した後は直せず、同じコードをもう使えないことを本文に書く", async () => {
    renderDialog();

    expect(await screen.findByRole("alertdialog")).toHaveAccessibleDescription(
      "定義した後は内容を変えられず、同じコードはもう使えません。配布を止めることはできます。",
    );
  });

  it("復唱を、語と値の組として渡された順に並べる", async () => {
    renderDialog();

    const dialog = await screen.findByRole("alertdialog");

    expect(
      within(dialog)
        .getAllByRole("term")
        .map((term) => term.textContent),
    ).toEqual(["キャンペーンコード", "値引き", "最低購入額"]);
    expect(
      within(dialog)
        .getAllByRole("definition")
        .map((detail) => detail.textContent),
    ).toEqual(["WELCOME-2026", "15% 引き（1 回 20 ドルまで）", "なし"]);
  });

  it("送ると、送る項目・冪等キー・確認の合図を載せる", async () => {
    const { props } = renderDialog();

    const dialog = await screen.findByRole("alertdialog");

    await userEvent.click(within(dialog).getByRole("button", { name: "定義する" }));

    const sent = vi.mocked(props.formAction).mock.calls[0]?.[0];

    expect(sent?.get("code")).toBe("welcome-2026");
    expect(sent?.get("discountKind")).toBe("rate");
    expect(sent?.get("discountMaxAmount")).toBe("20");
    expect(sent?.get("idempotencyKey")).toBe(IDEMPOTENCY_KEY);
    expect(sent?.get("confirmed")).toBe("true");
  });

  it("送っても自分では閉じない", async () => {
    const { props } = renderDialog();

    const dialog = await screen.findByRole("alertdialog");

    await userEvent.click(within(dialog).getByRole("button", { name: "定義する" }));

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

  // ----- 送っている間 -----
  it("送っている間は、待っていることを操作自身の名前で伝えて押せなくする", async () => {
    renderDialog({ formAction: pendingAction });

    const dialog = await screen.findByRole("alertdialog");

    await userEvent.click(within(dialog).getByRole("button", { name: "定義する" }));

    expect(await within(dialog).findByRole("button", { name: "定義しています…" })).toBeDisabled();
  });

  // ----- 失敗を返されたとき -----
  it("失敗が無ければ、失敗の報せを出さない", async () => {
    renderDialog();

    const dialog = await screen.findByRole("alertdialog");

    expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
  });

  it("直前の失敗を、1 つの報せの中に 1 つずつ出す", async () => {
    renderDialog({ failures: ["全体の文言", "期間の組み合わせを確認してください。"] });

    const dialog = await screen.findByRole("alertdialog");
    const alert = within(dialog).getByRole("alert");

    expect(within(dialog).getAllByRole("alert")).toHaveLength(1);
    expect(alert).toHaveTextContent("定義できませんでした");
    expect(within(alert).getByText("全体の文言")).toBeInTheDocument();
    expect(within(alert).getByText("期間の組み合わせを確認してください。")).toBeInTheDocument();
  });

  it("失敗を出した状態で a11y 検査を通る", async () => {
    renderDialog({ failures: ["全体の文言"] });

    const dialog = await screen.findByRole("alertdialog");

    expect(
      (await axe(dialog, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
