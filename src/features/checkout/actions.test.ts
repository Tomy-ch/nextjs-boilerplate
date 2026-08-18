import { beforeEach, describe, expect, it, vi } from "vitest";

import { createAppError } from "@/errors/app-error";
import { getDefaultErrorMeta } from "@/errors/error-catalog";
import { ErrorKind } from "@/errors/error-kind";
import { idleActionState } from "@/model/action-state";

const {
  createPurchase,
  getMyCart,
  redirect,
  removeMyCartItem,
  revalidatePath,
  setMyCartItem,
  warn,
} = vi.hoisted(() => ({
  createPurchase: vi.fn(),
  getMyCart: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  removeMyCartItem: vi.fn(),
  revalidatePath: vi.fn(),
  setMyCartItem: vi.fn(),
  warn: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/navigation", () => ({
  RedirectType: { push: "push", replace: "replace" },
  redirect,
}));
vi.mock("@/adapters/server/api/cart", () => ({ getMyCart, removeMyCartItem, setMyCartItem }));
vi.mock("@/adapters/server/api/purchases", () => ({ createPurchase }));
vi.mock("@/logging/logging.server", () => ({
  getLogger: () => ({ warn }),
  reportQuietly: (task: () => void) => task(),
}));

import { placeOrderAction } from "./actions";
import {
  BLOCKED_CART,
  EMPTY_CART,
  ORDERABLE_CART,
  PARTIALLY_ORDERABLE_CART,
} from "./checkout.fixture";
import type { PlaceOrderFormState } from "./form-state";
import { ACCEPT_PRICE_CHANGE_FIELD, IDEMPOTENCY_KEY_FIELD } from "./idempotency-key";

const KEY = "0195f0c2-0000-7000-a000-000000000001";
const PURCHASE_ID = "0195f0c2-0000-7000-9000-000000000001";
const IDLE: PlaceOrderFormState = idleActionState();

function formDataOf(overrides: Readonly<Record<string, string>> = {}): FormData {
  const formData = new FormData();

  formData.set(IDEMPOTENCY_KEY_FIELD, KEY);

  for (const [key, value] of Object.entries(overrides)) {
    formData.set(key, value);
  }

  return formData;
}

/** 送信の結果。redirect は例外で表れるため、その行き先も取り出す。 */
async function run(formData: FormData): Promise<{ state?: PlaceOrderFormState; to?: string }> {
  try {
    return { state: await placeOrderAction(IDLE, formData) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message.startsWith("NEXT_REDIRECT:")) {
      return { to: message.replace("NEXT_REDIRECT:", "") };
    }

    throw error;
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  getMyCart.mockResolvedValue(ORDERABLE_CART);
  createPurchase.mockResolvedValue(PURCHASE_ID);
});

describe("placeOrderAction", () => {
  // ----- 正常系 -----
  it("送る明細を、送信の時点のカートから組み直す", async () => {
    await run(formDataOf());

    expect(getMyCart).toHaveBeenCalled();
    expect(createPurchase).toHaveBeenCalledWith(
      [
        {
          productId: ORDERABLE_CART.lines[0]?.productId,
          quantity: ORDERABLE_CART.lines[0]?.quantity,
        },
        {
          productId: ORDERABLE_CART.lines[1]?.productId,
          quantity: ORDERABLE_CART.lines[1]?.quantity,
        },
      ],
      KEY,
    );
  });

  it("成立したら完了画面へ送る", async () => {
    expect((await run(formDataOf())).to).toBe(`/checkout/complete?purchase=${PURCHASE_ID}`);
  });

  it("送るのは積み増しではなく置き換えにする", async () => {
    await run(formDataOf());

    expect(redirect).toHaveBeenLastCalledWith(expect.any(String), "replace");
  });

  it("買った明細だけをカートから取り除く", async () => {
    await run(formDataOf());

    expect(removeMyCartItem.mock.calls.map(([productId]) => productId)).toEqual([
      ORDERABLE_CART.lines[0]?.productId,
      ORDERABLE_CART.lines[1]?.productId,
    ]);
  });

  it("外枠のカートも取り直させる", async () => {
    await run(formDataOf());

    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("承知の合図があれば、値の変わった明細を置き直してから購入する", async () => {
    getMyCart.mockResolvedValueOnce(PARTIALLY_ORDERABLE_CART);
    getMyCart.mockResolvedValueOnce(ORDERABLE_CART);

    await run(formDataOf({ [ACCEPT_PRICE_CHANGE_FIELD]: "1" }));

    expect(setMyCartItem).toHaveBeenCalledWith("0195f0c2-0000-7000-8000-000000000005", 1);
    // 置き直したあとのカートで購入する。取り直しが抜けると、置き直す前の明細のまま送られる。
    expect(createPurchase).toHaveBeenCalledWith(
      ORDERABLE_CART.lines.map((line) => ({ productId: line.productId, quantity: line.quantity })),
      KEY,
    );
  });

  // ----- 異常系 -----
  it("鍵が無い送信は受け付けない", async () => {
    const formData = new FormData();

    const { state } = await run(formData);

    expect(state).toMatchObject({
      formError: expect.stringContaining("開き直して"),
      status: "error",
    });
    expect(createPurchase).not.toHaveBeenCalled();
  });

  it("承知の合図が無いまま、値の変わった明細を送らない", async () => {
    getMyCart.mockResolvedValue(PARTIALLY_ORDERABLE_CART);

    const { state } = await run(formDataOf());

    expect(state).toMatchObject({ status: "error", formError: expect.stringContaining("金額") });
    expect(createPurchase).not.toHaveBeenCalled();
  });

  it("置き直しに失敗したら、購入へ進まない", async () => {
    getMyCart.mockResolvedValue(PARTIALLY_ORDERABLE_CART);
    setMyCartItem.mockRejectedValue(createAppError(ErrorKind.CONFLICT));

    const { state } = await run(formDataOf({ [ACCEPT_PRICE_CHANGE_FIELD]: "1" }));

    expect(state).toMatchObject({ status: "error" });
    expect(createPurchase).not.toHaveBeenCalled();
  });

  it("買える明細が 1 つも無ければ送らない", async () => {
    getMyCart.mockResolvedValue(BLOCKED_CART);

    const { state } = await run(formDataOf());

    expect(state).toMatchObject({
      formError: expect.stringContaining("購入できる商品がありません"),
      status: "error",
    });
    expect(createPurchase).not.toHaveBeenCalled();
  });

  it("空のカートでも送らない", async () => {
    getMyCart.mockResolvedValue(EMPTY_CART);

    expect((await run(formDataOf())).state).toMatchObject({
      formError: expect.stringContaining("購入できる商品がありません"),
      status: "error",
    });
  });

  it("在庫や価格が確定の瞬間に変わったときは、確かめ直させる", async () => {
    createPurchase.mockRejectedValue(createAppError(ErrorKind.CONFLICT));

    const { state } = await run(formDataOf());

    expect(state).toMatchObject({
      status: "error",
      formError: expect.stringContaining("在庫か価格"),
    });
  });

  it("それ以外の失敗は分類ごとの文言で返す", async () => {
    createPurchase.mockRejectedValue(createAppError(ErrorKind.UNAVAILABLE));

    expect((await run(formDataOf())).state).toMatchObject({
      formError: getDefaultErrorMeta(ErrorKind.UNAVAILABLE).message,
      status: "error",
    });
  });

  it("後始末が通らなくても完了へ送る", async () => {
    removeMyCartItem.mockRejectedValue(createAppError(ErrorKind.UNAVAILABLE));

    expect((await run(formDataOf())).to).toBe(`/checkout/complete?purchase=${PURCHASE_ID}`);
    expect(warn).toHaveBeenCalled();
  });
});
