// @vitest-environment jsdom

import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { ToastProvider } from "@/components/shell/toaster/toaster";
import { ErrorKind } from "@/errors/error-kind";
import { failedActionState, succeededActionState } from "@/model/action-state";
import { IDEMPOTENCY_KEY_FIELD } from "@/model/idempotency-key";

const { claimCouponAction } = vi.hoisted(() => ({
  claimCouponAction: vi.fn<(previous: unknown, formData: FormData) => Promise<unknown>>(),
}));

vi.mock("../../../actions", () => ({ claimCouponAction }));

import { CLAIM_CODE_FIELD } from "../../../form-names";
import { ClaimForm } from "./claim-form";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const REJECTED_MESSAGE = "このコードでは受け取れません。コードを確かめてください。";

function renderForm() {
  return render(
    <ToastProvider>
      <ClaimForm />
    </ToastProvider>,
  );
}

/** 欄へコードを入れて受け取る。 */
async function claim(code: string): Promise<void> {
  const user = userEvent.setup();
  const field = screen.getByLabelText("キャンペーンコード");

  await user.clear(field);
  await user.type(field, code);
  await user.click(screen.getByRole("button", { name: "受け取る" }));
}

/** n 回目の送信に載っていた内容。 */
function sentAt(index: number): FormData {
  const formData = claimCouponAction.mock.calls[index]?.[1];

  if (formData === undefined) {
    throw new Error(`${index + 1} 回目の送信がありません。`);
  }

  return formData;
}

function keySentAt(index: number): FormDataEntryValue | null {
  return sentAt(index).get(IDEMPOTENCY_KEY_FIELD);
}

beforeEach(() => {
  claimCouponAction.mockReset().mockResolvedValue(succeededActionState(undefined));
});

describe("ClaimForm", () => {
  // ----- まだ送っていないとき -----
  it("入力が空でも受け取りの操作は押せる", () => {
    renderForm();

    expect(screen.getByRole("button", { name: "受け取る" })).toBeEnabled();
  });

  it("コードが必須であることを入力欄が伝える", () => {
    renderForm();

    expect(screen.getByLabelText("キャンペーンコード")).toHaveAttribute("aria-required", "true");
    expect(screen.getByText("必須")).toBeVisible();
  });

  it.each([
    ["空", ""],
    ["空白だけ", "   "],
  ])("%sのまま押したら送らず、入力を促す文言を欄に紐づけて出す", async (_label, code) => {
    const user = userEvent.setup();

    renderForm();

    const field = screen.getByLabelText("キャンペーンコード");

    if (code !== "") {
      await user.type(field, code);
    }
    await user.click(screen.getByRole("button", { name: "受け取る" }));

    expect(claimCouponAction).not.toHaveBeenCalled();
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveAccessibleDescription("キャンペーンコードを入力してください。");
  });

  it("空のまま押した後に入力し直すと、入力を促す文言を消す", async () => {
    const user = userEvent.setup();

    renderForm();
    await user.click(screen.getByRole("button", { name: "受け取る" }));
    await user.type(screen.getByLabelText("キャンペーンコード"), "S");

    expect(screen.queryByText("キャンペーンコードを入力してください。")).not.toBeInTheDocument();
    expect(screen.getByLabelText("キャンペーンコード")).not.toHaveAttribute("aria-invalid");
  });

  it("入れたコードと uuid の冪等キーを送る", async () => {
    renderForm();

    await claim("SPRING");

    expect(sentAt(0).get(CLAIM_CODE_FIELD)).toBe("SPRING");
    expect(keySentAt(0)).toMatch(UUID);
  });

  it("項目の誤りが無ければ、入力欄に不正のマーカーを付けない", () => {
    renderForm();

    expect(screen.getByLabelText("キャンペーンコード")).not.toHaveAttribute("aria-invalid");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = renderForm();

    expect((await axe(container)).violations).toEqual([]);
  });

  // ----- 送っているとき -----
  it("送信中は待っている旨の名前に替わり、押せなくなる", async () => {
    let settle: (() => void) | undefined;

    claimCouponAction.mockImplementation(
      () =>
        new Promise((resolve) => {
          settle = () => resolve(succeededActionState(undefined));
        }),
    );
    renderForm();

    try {
      await claim("SPRING");

      expect(await screen.findByRole("button", { name: "受け取っています" })).toBeDisabled();
    } finally {
      await act(async () => {
        settle?.();
      });
    }
  });

  // ----- 受け取れたとき -----
  it("成立したら、入力を片付けて toast で知らせる", async () => {
    renderForm();

    await claim("SPRING");

    expect(await screen.findByText("クーポンを受け取りました")).toBeVisible();
    expect(screen.getByLabelText("キャンペーンコード")).toHaveValue("");
  });

  it("成立したら、次の受け取りは別のキーで送る", async () => {
    renderForm();

    await claim("SPRING");
    await claim("SUMMER");

    expect(keySentAt(1)).toMatch(UUID);
    expect(keySentAt(1)).not.toBe(keySentAt(0));
  });

  // ----- 受け取れなかったとき -----
  it("コードが弾かれたら、理由を言わない 1 つの文言を欄に紐づけて出す", async () => {
    claimCouponAction.mockResolvedValue(
      failedActionState({
        fieldErrors: { [CLAIM_CODE_FIELD]: [REJECTED_MESSAGE] },
        kind: ErrorKind.VALIDATION,
      }),
    );
    renderForm();

    await claim("UNKNOWN");

    const field = screen.getByLabelText("キャンペーンコード");

    expect(await screen.findByText(REJECTED_MESSAGE)).toBeVisible();
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveAccessibleDescription(REJECTED_MESSAGE);
    expect(field).toHaveValue("UNKNOWN");
    expect(screen.queryByText("受け取れませんでした")).not.toBeInTheDocument();
  });

  it("弾かれた後に空にして押すと、弾かれた文言に代えて入力を促す文言だけを出す", async () => {
    const user = userEvent.setup();

    claimCouponAction.mockResolvedValue(
      failedActionState({
        fieldErrors: { [CLAIM_CODE_FIELD]: [REJECTED_MESSAGE] },
        kind: ErrorKind.VALIDATION,
      }),
    );
    renderForm();

    await claim("UNKNOWN");
    await screen.findByText(REJECTED_MESSAGE);
    await user.clear(screen.getByLabelText("キャンペーンコード"));
    await user.click(screen.getByRole("button", { name: "受け取る" }));

    expect(claimCouponAction).toHaveBeenCalledOnce();
    expect(screen.getByLabelText("キャンペーンコード")).toHaveAccessibleDescription(
      "キャンペーンコードを入力してください。",
    );
    expect(screen.queryByText(REJECTED_MESSAGE)).not.toBeInTheDocument();
  });

  it("空のまま押した表示も a11y 自動検査に違反しない", async () => {
    const user = userEvent.setup();
    const { container } = renderForm();

    await user.click(screen.getByRole("button", { name: "受け取る" }));
    await screen.findByText("キャンペーンコードを入力してください。");

    expect((await axe(container)).violations).toEqual([]);
  });

  it("コードが弾かれたら、直したコードは別のキーで送る", async () => {
    claimCouponAction.mockResolvedValueOnce(
      failedActionState({
        fieldErrors: { [CLAIM_CODE_FIELD]: [REJECTED_MESSAGE] },
        kind: ErrorKind.VALIDATION,
      }),
    );
    renderForm();

    await claim("UNKNOWN");
    await claim("SPRING");

    expect(keySentAt(1)).toMatch(UUID);
    expect(keySentAt(1)).not.toBe(keySentAt(0));
  });

  it("読めない要求（400）で拒まれたら、次の送信は別のキーで送る", async () => {
    claimCouponAction.mockResolvedValueOnce(
      failedActionState({ formError: "読めない", kind: ErrorKind.INVALID_ARGUMENT }),
    );
    renderForm();

    await claim("SPRING");
    await claim("SPRING");

    expect(keySentAt(1)).toMatch(UUID);
    expect(keySentAt(1)).not.toBe(keySentAt(0));
  });

  it.each([
    ["処理中（409）", failedActionState({ formError: "処理中", kind: ErrorKind.CONFLICT })],
    ["使えない（503）", failedActionState({ formError: "使えない", kind: ErrorKind.UNAVAILABLE })],
    ["空のコード", failedActionState({ fieldErrors: { [CLAIM_CODE_FIELD]: ["空"] } })],
  ])("%sの後は、同じキーで送り直す", async (_label, failed) => {
    claimCouponAction.mockResolvedValueOnce(failed);
    renderForm();

    await claim("SPRING");
    await claim("SPRING");

    expect(keySentAt(1)).toBe(keySentAt(0));
  });

  it("項目に紐づかない失敗はフォームの脇に出し、欄には紐づけない", async () => {
    claimCouponAction.mockResolvedValue(
      failedActionState({
        formError: "しばらくしてからお試しください。",
        kind: ErrorKind.CONFLICT,
      }),
    );
    renderForm();

    await claim("SPRING");

    expect(await screen.findByText("受け取れませんでした")).toBeVisible();
    expect(screen.getByText("しばらくしてからお試しください。")).toBeVisible();
    expect(screen.getByLabelText("キャンペーンコード")).not.toHaveAttribute("aria-invalid");
  });

  it("通らなかったら入力を残し、toast は出さない", async () => {
    claimCouponAction.mockResolvedValue(
      failedActionState({
        formError: "しばらくしてからお試しください。",
        kind: ErrorKind.UNAVAILABLE,
      }),
    );
    renderForm();

    await claim("SPRING");

    expect(await screen.findByText("受け取れませんでした")).toBeVisible();
    expect(screen.getByLabelText("キャンペーンコード")).toHaveValue("SPRING");
    expect(screen.queryByText("クーポンを受け取りました")).not.toBeInTheDocument();
  });

  it("通らなかった表示も a11y 自動検査に違反しない", async () => {
    claimCouponAction.mockResolvedValue(
      failedActionState({
        fieldErrors: { [CLAIM_CODE_FIELD]: [REJECTED_MESSAGE] },
        kind: ErrorKind.VALIDATION,
      }),
    );
    const { container } = renderForm();

    await claim("UNKNOWN");
    await screen.findByText(REJECTED_MESSAGE);

    expect((await axe(container)).violations).toEqual([]);
  });
});
