import { beforeEach, describe, expect, it, vi } from "vitest";

import { PARSED_ENVIRONMENT } from "@/config/environment.fixture";
import { findAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import { serveJson, serveStatus, serveWrite } from "../../../../vitest.setup";

const { getAccessToken, getEnvironment, readCartSession, storeCartSession, clearCartSession } =
  vi.hoisted(() => ({
    getAccessToken: vi.fn(async (): Promise<string | null> => null),
    getEnvironment: vi.fn(() => PARSED_ENVIRONMENT),
    readCartSession: vi.fn(async (): Promise<string | null> => null),
    storeCartSession: vi.fn(async (): Promise<void> => undefined),
    clearCartSession: vi.fn(async (): Promise<void> => undefined),
  }));

vi.mock("@/config/environment", () => ({ getEnvironment }));
vi.mock("../auth/session", () => ({ getAccessToken }));
vi.mock("./cart-session", () => ({ readCartSession, storeCartSession, clearCartSession }));

import { toProductId } from "@/model/product/product";
import { clearMyCart, getMyCart, mergeGuestCart, removeMyCartItem, setMyCartItem } from "./cart";

const PRODUCT_ID = toProductId("0195f0c2-0000-7000-8000-000000000001");
const TOKEN = "2LOUdXuXEQ7Yg2nJRAgDA9yQbLyjGvoITuwDse3u9Z0";

const CART_URL = `${PARSED_ENVIRONMENT.APP_API_BASE_URL}/v1/carts/me`;
const CART_ITEM_URL = `${CART_URL}/items/:productId`;
const CART_MERGE_URL = `${CART_URL}/merge`;

const wireCart = {
  sessionToken: null,
  items: [
    {
      productId: PRODUCT_ID,
      productName: "ワイヤレスイヤホン",
      imagePath: "products/abc.png",
      quantity: 3,
      unitPrice: "19.99",
      issues: [],
      availableQuantity: null,
    },
  ],
  subtotalAmount: 5997,
  expiresAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  getAccessToken.mockResolvedValue(null);
  readCartSession.mockResolvedValue(null);
});

describe("getMyCart", () => {
  // ----- 正常系 -----
  it("契約の応答を表示用の明細へ写す", async () => {
    serveJson(CART_URL, wireCart);

    await expect(getMyCart()).resolves.toEqual({
      lines: [
        {
          productId: PRODUCT_ID,
          name: "ワイヤレスイヤホン",
          imageUrl: "https://media.example.test/products/abc.png",
          unitPrice: "19.99",
          quantity: 3,
          issues: [],
          availableQuantity: null,
        },
      ],
      subtotalAmount: 5997,
    });
  });

  it("欠けている名前と単価と画像を null として渡す", async () => {
    serveJson(CART_URL, {
      ...wireCart,
      items: [{ productId: PRODUCT_ID, quantity: 2, issues: ["notFound"] }],
    });

    const cart = await getMyCart();

    expect(cart.lines[0]).toMatchObject({
      name: null,
      imageUrl: null,
      unitPrice: null,
      availableQuantity: null,
    });
  });

  it("ゲストの識別子を持っているとき、ヘッダへ載せて送る", async () => {
    readCartSession.mockResolvedValue(TOKEN);
    const requests = serveJson(CART_URL, wireCart);

    await getMyCart();

    expect(requests[0]?.headers.get("X-Cart-Session")).toBe(TOKEN);
  });

  it("識別子を持っていないとき、認証なしで送る", async () => {
    const requests = serveJson(CART_URL, wireCart);

    await getMyCart();

    expect(requests[0]?.headers.get("X-Cart-Session")).toBeNull();
    expect(requests[0]?.headers.get("Authorization")).toBeNull();
  });

  it("認証済みのとき Bearer を載せる", async () => {
    getAccessToken.mockResolvedValue("access-token");
    const requests = serveJson(CART_URL, wireCart);

    await getMyCart();

    expect(requests[0]?.headers.get("Authorization")).toBe("Bearer access-token");
  });

  // ----- 異常系 -----
  it("契約と違う応答のとき internal として投げる", async () => {
    serveJson(CART_URL, { items: "壊れた形" });

    await expect(getMyCart()).rejects.toSatisfy(
      (error: unknown) => findAppError(error)?.kind === ErrorKind.INTERNAL,
    );
  });
});

describe("setMyCartItem", () => {
  // ----- 正常系 -----
  it("数量を本文へ載せて設定を送る", async () => {
    const requests = serveWrite("put", CART_ITEM_URL, wireCart);

    await setMyCartItem(PRODUCT_ID, 3);

    expect(requests[0]?.url).toBe(`${CART_URL}/items/${PRODUCT_ID}`);
    await expect(requests[0]?.json()).resolves.toEqual({ quantity: 3 });
  });

  it("設定後のカートを、取得と同じ表示用の明細へ写して返す", async () => {
    serveWrite("put", CART_ITEM_URL, wireCart);

    await expect(setMyCartItem(PRODUCT_ID, 3)).resolves.toMatchObject({
      lines: [{ imageUrl: "https://media.example.test/products/abc.png" }],
    });
  });

  it("発行された識別子を cookie へ引き取る", async () => {
    serveWrite("put", CART_ITEM_URL, {
      ...wireCart,
      sessionToken: TOKEN,
      expiresAt: "2026-09-14T16:31:59+09:00",
    });

    await setMyCartItem(PRODUCT_ID, 1);

    expect(storeCartSession).toHaveBeenCalledWith(TOKEN, new Date("2026-09-14T16:31:59+09:00"));
  });

  it("識別子が載っていない応答では cookie を触らない", async () => {
    serveWrite("put", CART_ITEM_URL, wireCart);

    await setMyCartItem(PRODUCT_ID, 1);

    expect(storeCartSession).not.toHaveBeenCalled();
  });

  it("有効期限が判らないまま識別子だけ載っているとき、寿命を渡さない", async () => {
    serveWrite("put", CART_ITEM_URL, { ...wireCart, sessionToken: TOKEN, expiresAt: null });

    await setMyCartItem(PRODUCT_ID, 1);

    expect(storeCartSession).toHaveBeenCalledWith(TOKEN, null);
  });

  // ----- 異常系 -----
  it("契約が拒んだとき invalid-argument として投げる", async () => {
    serveStatus("put", CART_ITEM_URL, 400);

    await expect(setMyCartItem(PRODUCT_ID, 0)).rejects.toSatisfy(
      (error: unknown) => findAppError(error)?.kind === ErrorKind.INVALID_ARGUMENT,
    );
  });
});

describe("removeMyCartItem", () => {
  // ----- 正常系 -----
  it("対象の明細へ削除を送る", async () => {
    const requests = serveStatus("delete", CART_ITEM_URL, 204);

    await removeMyCartItem(PRODUCT_ID);

    expect(requests[0]?.url).toBe(`${CART_URL}/items/${PRODUCT_ID}`);
    expect(requests[0]?.method).toBe("DELETE");
  });

  // ----- 異常系 -----
  it("上流が落ちているとき unavailable として投げる", async () => {
    serveStatus("delete", CART_ITEM_URL, 503);

    await expect(removeMyCartItem(PRODUCT_ID)).rejects.toSatisfy(
      (error: unknown) => findAppError(error)?.kind === ErrorKind.UNAVAILABLE,
    );
  });
});

describe("clearMyCart", () => {
  // ----- 正常系 -----
  it("カートを空にする要求を送る", async () => {
    const requests = serveStatus("delete", CART_URL, 204);

    await clearMyCart();

    expect(requests[0]?.url).toBe(CART_URL);
    expect(requests[0]?.method).toBe("DELETE");
  });
});

describe("mergeGuestCart", () => {
  // ----- 正常系 -----
  it("引き継ぎの結果を表示用の形へ写す", async () => {
    readCartSession.mockResolvedValue(TOKEN);
    getAccessToken.mockResolvedValue("access-token");
    serveWrite("post", CART_MERGE_URL, { clamped: [PRODUCT_ID], dropped: [] });

    await expect(mergeGuestCart()).resolves.toEqual({
      clampedProductIds: [PRODUCT_ID],
      droppedProductIds: [],
    });
  });

  it("成功したとき、引き継ぎ元の識別子を破棄する", async () => {
    readCartSession.mockResolvedValue(TOKEN);
    getAccessToken.mockResolvedValue("access-token");
    serveWrite("post", CART_MERGE_URL, { clamped: [], dropped: [] });

    await mergeGuestCart();

    expect(clearCartSession).toHaveBeenCalledOnce();
  });

  it("引き継ぐ識別子が無いとき、何も送らず null を返す", async () => {
    const requests = serveWrite("post", CART_MERGE_URL, { clamped: [], dropped: [] });

    await expect(mergeGuestCart()).resolves.toBeNull();
    expect(requests).toHaveLength(0);
  });

  // ----- 異常系 -----
  it("失敗したとき、識別子を残したまま投げる", async () => {
    readCartSession.mockResolvedValue(TOKEN);
    getAccessToken.mockResolvedValue("access-token");
    serveStatus("post", CART_MERGE_URL, 401);

    await expect(mergeGuestCart()).rejects.toSatisfy(
      (error: unknown) => findAppError(error)?.kind === ErrorKind.UNAUTHENTICATED,
    );
    expect(clearCartSession).not.toHaveBeenCalled();
  });
});
