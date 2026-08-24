import { beforeEach, describe, expect, it, vi } from "vitest";

import { createAppError } from "@/errors/app-error";
import { getDefaultErrorMeta } from "@/errors/error-catalog";
import { ErrorKind } from "@/errors/error-kind";
import { idleActionState } from "@/model/action-state";

const { cancelMyPurchase, payMyPurchase, revalidatePath } = vi.hoisted(() => ({
  cancelMyPurchase: vi.fn(),
  payMyPurchase: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/adapters/server/api/purchases", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/adapters/server/api/purchases")>()),
  cancelMyPurchase,
  payMyPurchase,
}));

import { cancelPurchaseAction, payPurchaseAction } from "./actions";
import {
  CANCEL_CONFLICT_MESSAGE,
  PAY_CONFLICT_MESSAGE,
  TRANSITION_TARGET_LOST_MESSAGE,
} from "./form-state";

const PURCHASE_CODE = "0195f0c2-0000-7000-9000-000000000001";

/** 形の上で通る最小の入力。 */
function transitionForm(purchaseCode: string = PURCHASE_CODE): FormData {
  const form = new FormData();

  if (purchaseCode !== "") form.append("purchaseCode", purchaseCode);

  return form;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("cancelPurchaseAction", () => {
  // ----- 正常系 -----
  it("受け取った購入コードの購入を取り消す", async () => {
    await cancelPurchaseAction(idleActionState(), transitionForm());

    expect(cancelMyPurchase).toHaveBeenCalledWith(PURCHASE_CODE);
  });

  it("成立したら、その購入の詳細を取り直させる", async () => {
    const state = await cancelPurchaseAction(idleActionState(), transitionForm());

    expect(state.status).toBe("success");
    expect(revalidatePath).toHaveBeenCalledWith(`/purchases/${PURCHASE_CODE}`);
  });

  // ----- 異常系 -----
  it("対象が送られてこなければ、取り消しを試みない", async () => {
    const state = await cancelPurchaseAction(idleActionState(), transitionForm(""));

    expect(state).toMatchObject({ status: "error", formError: TRANSITION_TARGET_LOST_MESSAGE });
    expect(cancelMyPurchase).not.toHaveBeenCalled();
  });

  it("状況で拒まれたことを、取り消し専用の文言で伝える", async () => {
    cancelMyPurchase.mockRejectedValueOnce(createAppError(ErrorKind.CONFLICT));

    const state = await cancelPurchaseAction(idleActionState(), transitionForm());

    expect(state).toMatchObject({
      status: "error",
      formError: CANCEL_CONFLICT_MESSAGE,
      kind: ErrorKind.CONFLICT,
    });
  });

  it("それ以外の失敗は分類ごとの既定の文言で伝える", async () => {
    cancelMyPurchase.mockRejectedValueOnce(createAppError(ErrorKind.UNAVAILABLE));

    const state = await cancelPurchaseAction(idleActionState(), transitionForm());

    expect(state).toMatchObject({
      status: "error",
      kind: ErrorKind.UNAVAILABLE,
      formError: getDefaultErrorMeta(ErrorKind.UNAVAILABLE).message,
    });
  });

  it("失敗したときは取り直させない", async () => {
    cancelMyPurchase.mockRejectedValueOnce(createAppError(ErrorKind.CONFLICT));

    await cancelPurchaseAction(idleActionState(), transitionForm());

    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("payPurchaseAction", () => {
  // ----- 正常系 -----
  it("受け取った購入コードの購入を支払う", async () => {
    await payPurchaseAction(idleActionState(), transitionForm());

    expect(payMyPurchase).toHaveBeenCalledWith(PURCHASE_CODE);
  });

  it("成立したら、その購入の詳細を取り直させる", async () => {
    const state = await payPurchaseAction(idleActionState(), transitionForm());

    expect(state.status).toBe("success");
    expect(revalidatePath).toHaveBeenCalledWith(`/purchases/${PURCHASE_CODE}`);
  });

  // ----- 異常系 -----
  it("対象が送られてこなければ、支払いを試みない", async () => {
    const state = await payPurchaseAction(idleActionState(), transitionForm(""));

    expect(state).toMatchObject({ status: "error", formError: TRANSITION_TARGET_LOST_MESSAGE });
    expect(payMyPurchase).not.toHaveBeenCalled();
  });

  it("状況で拒まれたことを、支払い専用の文言で伝える", async () => {
    payMyPurchase.mockRejectedValueOnce(createAppError(ErrorKind.CONFLICT));

    const state = await payPurchaseAction(idleActionState(), transitionForm());

    expect(state).toMatchObject({
      status: "error",
      formError: PAY_CONFLICT_MESSAGE,
      kind: ErrorKind.CONFLICT,
    });
  });

  it("それ以外の失敗は分類ごとの既定の文言で伝える", async () => {
    payMyPurchase.mockRejectedValueOnce(createAppError(ErrorKind.INTERNAL));

    const state = await payPurchaseAction(idleActionState(), transitionForm());

    expect(state).toMatchObject({
      status: "error",
      kind: ErrorKind.INTERNAL,
      formError: getDefaultErrorMeta(ErrorKind.INTERNAL).message,
    });
  });
});
