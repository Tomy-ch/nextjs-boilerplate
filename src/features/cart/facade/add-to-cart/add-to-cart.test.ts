import { beforeEach, describe, expect, it, vi } from "vitest";

import { createAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import { idleActionState } from "@/model/action-state";
import type { Cart } from "@/model/cart/cart";

const { getMyCart, setMyCartItem, revalidatePath } = vi.hoisted(() => ({
  getMyCart: vi.fn(),
  setMyCartItem: vi.fn(async (): Promise<void> => undefined),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/adapters/server/api/cart", () => ({ getMyCart, setMyCartItem }));

import { toProductId } from "@/model/product/product";
import { addToCartAction } from "./add-to-cart";

const PRODUCT_ID = toProductId("0195f0c2-0000-7000-8000-000000000001");

/** 送信された内容を解けなかったときの文言。実装が持つリテラルと同じでなければならない。 */
const MALFORMED_MESSAGE = "操作を受け付けられませんでした。画面を読み込み直してください。";

const emptyCart: Cart = { lines: [], subtotalAmount: 0 };

/** 送信された内容を組み立てる。 */
function formOf(entries: Readonly<Record<string, string | Blob>>): FormData {
  const formData = new FormData();

  for (const [key, value] of Object.entries(entries)) {
    formData.append(key, value);
  }

  return formData;
}

beforeEach(() => {
  vi.clearAllMocks();
  getMyCart.mockResolvedValue(emptyCart);
});

describe("addToCartAction", () => {
  // ----- 正常系 -----
  it("入っていない商品を、数量 1 として設定する", async () => {
    const state = await addToCartAction(idleActionState(), formOf({ productId: PRODUCT_ID }));

    expect(setMyCartItem).toHaveBeenCalledWith(PRODUCT_ID, 1);
    expect(state).toEqual({ status: "success", value: undefined });
  });

  it("既に入っている商品は、現在の数量へ 1 を足した値を設定する", async () => {
    getMyCart.mockResolvedValue({
      lines: [
        {
          productId: PRODUCT_ID,
          name: "ワイヤレスイヤホン",
          unitPrice: "19.99",
          quantity: 2,
          issues: [],
          availableQuantity: null,
        },
      ],
      subtotalAmount: 3998,
    } satisfies Cart);

    await addToCartAction(idleActionState(), formOf({ productId: PRODUCT_ID }));

    expect(setMyCartItem).toHaveBeenCalledWith(PRODUCT_ID, 3);
  });

  it("成功したとき、外枠まで含めて取り直させる", async () => {
    await addToCartAction(idleActionState(), formOf({ productId: PRODUCT_ID }));

    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  // ----- 異常系 -----
  it("商品を指す値が無いとき、読まずに文言を返す", async () => {
    const state = await addToCartAction(idleActionState(), formOf({}));

    expect(getMyCart).not.toHaveBeenCalled();
    expect(state).toMatchObject({ status: "error", formError: MALFORMED_MESSAGE });
  });

  it("商品を指す値が空のとき、読まずに文言を返す", async () => {
    const state = await addToCartAction(idleActionState(), formOf({ productId: "" }));

    expect(getMyCart).not.toHaveBeenCalled();
    expect(state).toMatchObject({ status: "error", formError: MALFORMED_MESSAGE });
  });

  it("文字列でない値が届いたとき、読まずに文言を返す", async () => {
    const state = await addToCartAction(
      idleActionState(),
      formOf({ productId: new Blob([PRODUCT_ID]) }),
    );

    expect(getMyCart).not.toHaveBeenCalled();
    expect(state).toMatchObject({ status: "error", formError: MALFORMED_MESSAGE });
  });

  it("現在の数量を読めなかったとき、送らずに文言を返す", async () => {
    getMyCart.mockRejectedValueOnce(createAppError(ErrorKind.UNAVAILABLE));

    const state = await addToCartAction(idleActionState(), formOf({ productId: PRODUCT_ID }));

    expect(setMyCartItem).not.toHaveBeenCalled();
    expect(state).toMatchObject({
      status: "error",
      formError: "現在サービスを利用できません。しばらくしてから再試行してください。",
    });
  });

  it("設定が拒まれたとき、取り直させずに文言を返す", async () => {
    setMyCartItem.mockRejectedValueOnce(createAppError(ErrorKind.INVALID_ARGUMENT));

    const state = await addToCartAction(idleActionState(), formOf({ productId: PRODUCT_ID }));

    expect(revalidatePath).not.toHaveBeenCalled();
    expect(state).toMatchObject({ status: "error", formError: "入力内容が正しくありません。" });
  });
});
