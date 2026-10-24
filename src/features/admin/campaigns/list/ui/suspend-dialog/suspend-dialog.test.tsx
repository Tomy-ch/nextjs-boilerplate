// @vitest-environment jsdom

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { IDEMPOTENCY_KEY_FIELD } from "@/model/idempotency-key";

import { SUSPEND_FORM_NAMES } from "../../form-names";
import { UPCOMING_CAMPAIGN_ROW } from "../../list.fixture";
import { CampaignSuspendDialog, type SuspendConfirmation } from "./suspend-dialog";

const IDEMPOTENCY_KEY = "0195f0c2-0000-7000-8000-0000000000aa";

const CONFIRMATION: SuspendConfirmation = {
  target: UPCOMING_CAMPAIGN_ROW,
  idempotencyKey: IDEMPOTENCY_KEY,
};

function renderDialog(
  overrides: Partial<{
    confirmation: SuspendConfirmation | null;
    onDismiss: () => void;
    formAction: (formData: FormData) => void;
  }> = {},
) {
  const props = {
    confirmation: CONFIRMATION,
    onDismiss: vi.fn(),
    formAction: vi.fn(),
    ...overrides,
  };

  return { ...render(<CampaignSuspendDialog {...props} />), props };
}

function hiddenField(name: string) {
  return document.querySelector(`input[name="${name}"]`);
}

describe("CampaignSuspendDialog", () => {
  // ----- 確認していないとき -----
  it("確認する相手が無ければ開かない", () => {
    renderDialog({ confirmation: null });

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  // ----- 確認しているとき -----
  it("相手が決まったら、そのコードを見出しに出して開く", async () => {
    renderDialog();

    expect(await screen.findByRole("alertdialog")).toHaveAccessibleName(
      `${UPCOMING_CAMPAIGN_ROW.code} の配布を停止しますか？`,
    );
  });

  it("取り消せないことを本文に書く", async () => {
    renderDialog();

    const dialog = await screen.findByRole("alertdialog");

    expect(within(dialog).getByText(/取り消せない操作です/)).toBeInTheDocument();
  });

  it("配ったクーポンは無効にならないことを本文に書く", async () => {
    renderDialog();

    const dialog = await screen.findByRole("alertdialog");

    expect(within(dialog).getByText(/すでに配ったクーポンは無効にならない/)).toBeInTheDocument();
  });

  it("送信には対象・コード・この確認の冪等キーを載せる", async () => {
    renderDialog();

    await screen.findByRole("alertdialog");

    expect(hiddenField(SUSPEND_FORM_NAMES.campaignId)).toHaveValue(UPCOMING_CAMPAIGN_ROW.id);
    expect(hiddenField(SUSPEND_FORM_NAMES.campaignCode)).toHaveValue(UPCOMING_CAMPAIGN_ROW.code);
    expect(hiddenField(IDEMPOTENCY_KEY_FIELD)).toHaveValue(IDEMPOTENCY_KEY);
  });

  it("やめる操作は送信せず、確認をやめたことだけを伝える", async () => {
    const { props } = renderDialog();

    const dialog = await screen.findByRole("alertdialog");

    await userEvent.click(within(dialog).getByRole("button", { name: "やめる" }));

    expect(props.onDismiss).toHaveBeenCalledTimes(1);
    expect(props.formAction).not.toHaveBeenCalled();
  });

  it("背景を押しても確認をやめない", async () => {
    const { props } = renderDialog();

    await screen.findByRole("alertdialog");

    const overlay = document.querySelector('[data-slot="alert-dialog-overlay"]');

    if (!(overlay instanceof HTMLElement)) throw new Error("背景の覆いが描かれていません");

    await userEvent.click(overlay);

    expect(props.onDismiss).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("停止の操作は送信する", async () => {
    const { props } = renderDialog();

    const dialog = await screen.findByRole("alertdialog");

    await userEvent.click(within(dialog).getByRole("button", { name: "停止する" }));

    await waitFor(() => expect(props.formAction).toHaveBeenCalledTimes(1));
    expect(props.onDismiss).not.toHaveBeenCalled();
  });

  it("a11y 検査を通る", async () => {
    renderDialog();

    const dialog = await screen.findByRole("alertdialog");

    expect(
      (await axe(dialog, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
