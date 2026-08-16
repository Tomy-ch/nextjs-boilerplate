import { beforeEach, describe, expect, it, vi } from "vitest";

import { createAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import { idleActionState } from "@/model/action-state";

const { clearMyCart, removeMyCartItem, setMyCartItem, revalidatePath } = vi.hoisted(() => ({
  clearMyCart: vi.fn(async (): Promise<void> => undefined),
  removeMyCartItem: vi.fn(async (): Promise<void> => undefined),
  setMyCartItem: vi.fn(async (): Promise<void> => undefined),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/adapters/server/api/cart", () => ({ clearMyCart, removeMyCartItem, setMyCartItem }));

import { clearCartAction, removeCartItemAction, setCartItemQuantityAction } from "./actions";

const PRODUCT_ID = "0195f0c2-0000-7000-8000-000000000001";

/** 送信された内容を組み立てる。 */
function formOf(entries: Readonly<Record<string, string>>): FormData {
  const formData = new FormData();

  for (const [key, value] of Object.entries(entries)) {
    formData.append(key, value);
  }

  return formData;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("setCartItemQuantityAction", () => {
  // ----- 正常系 -----
  it("受け取った数量をそのまま設定する", async () => {
    const state = await setCartItemQuantityAction(
      idleActionState(),
      formOf({ productId: PRODUCT_ID, quantity: "4" }),
    );

    expect(setMyCartItem).toHaveBeenCalledWith(PRODUCT_ID, 4);
    expect(state).toEqual({ status: "success", value: undefined });
  });

  it("成功したとき、外枠まで含めて取り直させる", async () => {
    await setCartItemQuantityAction(
      idleActionState(),
      formOf({ productId: PRODUCT_ID, quantity: "1" }),
    );

    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  // ----- 異常系 -----
  it("商品を指す値が無いとき、送らずに文言を返す", async () => {
    const state = await setCartItemQuantityAction(idleActionState(), formOf({ quantity: "1" }));

    expect(setMyCartItem).not.toHaveBeenCalled();
    expect(state).toMatchObject({ status: "error", formError: expect.any(String) });
  });

  it("数量が整数として読めないとき、送らずに文言を返す", async () => {
    const state = await setCartItemQuantityAction(
      idleActionState(),
      formOf({ productId: PRODUCT_ID, quantity: "たくさん" }),
    );

    expect(setMyCartItem).not.toHaveBeenCalled();
    expect(state).toMatchObject({ status: "error", formError: expect.any(String) });
  });

  it("バックエンドが拒んだとき、分類に応じた文言を返し取り直させない", async () => {
    setMyCartItem.mockRejectedValueOnce(createAppError(ErrorKind.INVALID_ARGUMENT));

    const state = await setCartItemQuantityAction(
      idleActionState(),
      formOf({ productId: PRODUCT_ID, quantity: "1" }),
    );

    expect(state).toMatchObject({ status: "error", formError: expect.any(String) });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("removeCartItemAction", () => {
  // ----- 正常系 -----
  it("対象の明細を取り除き、取り直させる", async () => {
    const state = await removeCartItemAction(idleActionState(), formOf({ productId: PRODUCT_ID }));

    expect(removeMyCartItem).toHaveBeenCalledWith(PRODUCT_ID);
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
    expect(state).toEqual({ status: "success", value: undefined });
  });

  // ----- 異常系 -----
  it("商品を指す値が無いとき、送らずに文言を返す", async () => {
    const state = await removeCartItemAction(idleActionState(), formOf({}));

    expect(removeMyCartItem).not.toHaveBeenCalled();
    expect(state).toMatchObject({ status: "error", formError: expect.any(String) });
  });

  it("バックエンドが落ちたとき文言を返す", async () => {
    removeMyCartItem.mockRejectedValueOnce(createAppError(ErrorKind.UNAVAILABLE));

    const state = await removeCartItemAction(idleActionState(), formOf({ productId: PRODUCT_ID }));

    expect(state).toMatchObject({ status: "error", formError: expect.any(String) });
  });
});

describe("clearCartAction", () => {
  // ----- 正常系 -----
  it("カートを空にして取り直させる", async () => {
    const state = await clearCartAction(idleActionState(), formOf({}));

    expect(clearMyCart).toHaveBeenCalledOnce();
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
    expect(state).toEqual({ status: "success", value: undefined });
  });

  // ----- 異常系 -----
  it("バックエンドが落ちたとき文言を返す", async () => {
    clearMyCart.mockRejectedValueOnce(createAppError(ErrorKind.INTERNAL));

    const state = await clearCartAction(idleActionState(), formOf({}));

    expect(state).toMatchObject({ status: "error", formError: expect.any(String) });
  });
});
