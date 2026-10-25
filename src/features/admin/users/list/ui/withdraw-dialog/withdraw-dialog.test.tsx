// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { toUserId } from "@/model/user/user";

import type { AdminUserRow } from "../../row";
import { UserWithdrawDialog } from "./withdraw-dialog";

const TARGET: AdminUserRow = {
  id: toUserId("0195f0c2-0000-7000-8000-000000000001"),
  name: "山田 太郎",
  email: "yamada@example.com",
  phone: "09012345678",
  withdrawn: false,
};

function renderDialog(
  overrides: Partial<{
    target: AdminUserRow | null;
    onDismiss: () => void;
    formAction: (formData: FormData) => void;
  }> = {},
) {
  const props = {
    target: TARGET,
    onDismiss: vi.fn(),
    formAction: vi.fn(),
    ...overrides,
  };

  return { ...render(<UserWithdrawDialog {...props} />), props };
}

describe("UserWithdrawDialog", () => {
  it("確認する相手が無ければ開かない", () => {
    renderDialog({ target: null });

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("相手が決まったら、その名前を見出しに出して開く", async () => {
    renderDialog();

    expect(await screen.findByRole("alertdialog")).toHaveAccessibleName(
      "山田 太郎 を退会させますか？",
    );
  });

  it("戻せないことと、後始末が同時には終わらないことを本文に書く", async () => {
    renderDialog();

    const dialog = await screen.findByRole("alertdialog");

    expect(within(dialog).getByText(/元に戻せません/)).toBeInTheDocument();
    expect(within(dialog).getByText(/後から順に進む/)).toBeInTheDocument();
  });

  it("送信には対象と呼び名を載せる", async () => {
    const { container } = renderDialog();

    await screen.findByRole("alertdialog");

    expect(container.ownerDocument.querySelector('input[name="userId"]')).toHaveValue(TARGET.id);
    expect(container.ownerDocument.querySelector('input[name="userName"]')).toHaveValue(
      "山田 太郎",
    );
  });

  it("やめる操作は送信せず、確認をやめたことだけを伝える", async () => {
    const { props } = renderDialog();

    const dialog = await screen.findByRole("alertdialog");

    await userEvent.click(within(dialog).getByRole("button", { name: "やめる" }));

    expect(props.formAction).not.toHaveBeenCalled();
    expect(props.onDismiss).toHaveBeenCalled();
  });

  it("退会の操作は送信する", async () => {
    const { props } = renderDialog();

    const dialog = await screen.findByRole("alertdialog");

    await userEvent.click(within(dialog).getByRole("button", { name: "退会させる" }));

    expect(props.formAction).toHaveBeenCalled();
  });

  it("a11y 検査を通る", async () => {
    renderDialog();

    const dialog = await screen.findByRole("alertdialog");

    expect(
      (await axe(dialog, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
