import { beforeEach, describe, expect, it, vi } from "vitest";

import { createAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import {
  SHIPMENT_CONFLICT_MESSAGE,
  SHIPMENT_TARGET_LOST_MESSAGE,
} from "@/features/admin/shipments/form-state";
import { idleActionState } from "@/model/action-state";
import { SESSION_ROLE } from "@/model/session";

const { revalidatePath, shipPurchase, verifySession } = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  shipPurchase: vi.fn(),
  verifySession: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/adapters/server/auth/session", () => ({ verifySession }));
vi.mock("@/adapters/server/api/purchases", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/adapters/server/api/purchases")>()),
  shipPurchase,
}));

import { shipPurchasesAction } from "./actions";

const CODES = [
  "0195f0c2-0000-7000-9000-000000000001",
  "0195f0c2-0000-7000-9000-000000000002",
  "0195f0c2-0000-7000-9000-000000000003",
];

const [FIRST_CODE = ""] = CODES;

/** 発送する注文を並べた送信。 */
function shipmentForm(purchaseCodes: readonly string[] = CODES): FormData {
  const form = new FormData();

  for (const purchaseCode of purchaseCodes) {
    form.append("purchaseCode", purchaseCode);
  }

  return form;
}

beforeEach(() => {
  vi.clearAllMocks();
  verifySession.mockResolvedValue({ subject: "admin", role: SESSION_ROLE.admin });
});

describe("shipPurchasesAction", () => {
  // ----- 正常系 -----
  it("受け取った注文を、届いた順に 1 件ずつ発送する", async () => {
    await shipPurchasesAction(idleActionState(), shipmentForm());

    expect(shipPurchase.mock.calls.map(([code]) => code)).toEqual(CODES);
  });

  it("通った件数を結果に載せる", async () => {
    const state = await shipPurchasesAction(idleActionState(), shipmentForm());

    expect(state).toMatchObject({ status: "success", value: { shipped: 3, refused: 0 } });
  });

  it("成立したら発送待ちの一覧を取り直させる", async () => {
    await shipPurchasesAction(idleActionState(), shipmentForm());

    expect(revalidatePath).toHaveBeenCalledWith("/admin/shipments");
  });

  it("いまの状況で通らなかった注文は数えて先へ進む", async () => {
    shipPurchase.mockRejectedValueOnce(createAppError(ErrorKind.CONFLICT));

    const state = await shipPurchasesAction(idleActionState(), shipmentForm());

    expect(state).toMatchObject({ status: "success", value: { shipped: 2, refused: 1 } });
    expect(shipPurchase).toHaveBeenCalledTimes(3);
  });

  // ----- 異常系 -----
  it("役割が足りない主体の要求を、発送を試みる前に止める", async () => {
    verifySession.mockResolvedValue({ subject: "someone", role: SESSION_ROLE.user });

    const state = await shipPurchasesAction(idleActionState(), shipmentForm());

    expect(state).toMatchObject({ status: "error", kind: ErrorKind.PERMISSION_DENIED });
    expect(shipPurchase).not.toHaveBeenCalled();
  });

  it("対象が送られてこなければ、発送を試みない", async () => {
    const state = await shipPurchasesAction(idleActionState(), shipmentForm([]));

    expect(state).toMatchObject({ status: "error", formError: SHIPMENT_TARGET_LOST_MESSAGE });
    expect(shipPurchase).not.toHaveBeenCalled();
  });

  it("注文として読めない値は、発送の対象にしない", async () => {
    const form = new FormData();
    form.append("purchaseCode", "");
    form.append("purchaseCode", new File([], "note.txt"));
    form.append("purchaseCode", FIRST_CODE);

    await shipPurchasesAction(idleActionState(), form);

    expect(shipPurchase.mock.calls.map(([code]) => code)).toEqual([FIRST_CODE]);
  });

  it("1 件も通らなければ失敗として返す", async () => {
    shipPurchase.mockRejectedValue(createAppError(ErrorKind.CONFLICT));

    const state = await shipPurchasesAction(idleActionState(), shipmentForm());

    expect(state).toMatchObject({
      status: "error",
      formError: SHIPMENT_CONFLICT_MESSAGE,
      kind: ErrorKind.CONFLICT,
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("競合以外の失敗では、残りを送らずに止める", async () => {
    shipPurchase.mockRejectedValueOnce(createAppError(ErrorKind.UNAVAILABLE));

    const state = await shipPurchasesAction(idleActionState(), shipmentForm());

    expect(state).toMatchObject({ status: "error", kind: ErrorKind.UNAVAILABLE });
    expect(shipPurchase).toHaveBeenCalledTimes(1);
  });

  it("途中で打ち切っても、そこまでに通った発送を一覧へ反映させる", async () => {
    shipPurchase.mockResolvedValueOnce(undefined);
    shipPurchase.mockRejectedValueOnce(createAppError(ErrorKind.UNAVAILABLE));

    await shipPurchasesAction(idleActionState(), shipmentForm());

    expect(shipPurchase).toHaveBeenCalledTimes(2);
    expect(revalidatePath).toHaveBeenCalledWith("/admin/shipments");
  });

  it("1 件も通らずに打ち切ったときは取り直させない", async () => {
    shipPurchase.mockRejectedValueOnce(createAppError(ErrorKind.UNAVAILABLE));

    await shipPurchasesAction(idleActionState(), shipmentForm());

    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
