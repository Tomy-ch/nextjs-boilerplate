import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Environment } from "@/config/environment";
import { findAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";

const environment: Environment = {
  APP_API_BASE_URL: "https://api.example.test",
  APP_API_MODE: "mock",
  MEDIA_ORIGIN: "https://media.example.test",
  OTEL_EXPORTER_OTLP_ENDPOINT: "https://otel.example.test/v1/traces",
  OBS_TRACES_EXPORTER: "none",
  OBS_METRICS_EXPORTER: "none",
  OBS_LOGS_EXPORTER: "none",
  AUTH_ISSUER: "https://id.example.test",
  AUTH_CLIENT_ID: "nextjs-boilerplate",
  AUTH_REDIRECT_URI: "https://app.example.test/auth/callback",
  AUTH_SCOPES: "openid profile",
  AUTH_SESSION_SECRET: "01234567890123456789012345678901",
  NEXT_PUBLIC_HTTP_MAX_URL_BYTES: 8000,
};

const { getAccessToken, getEnvironment, readCartSession, storeCartSession, clearCartSession } =
  vi.hoisted(() => ({
    getAccessToken: vi.fn(async (): Promise<string | null> => null),
    getEnvironment: vi.fn(() => environment),
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

const wireCart = {
  sessionToken: null,
  items: [
    {
      productId: PRODUCT_ID,
      productName: "ワイヤレスイヤホン",
      quantity: 3,
      unitPrice: "19.99",
      issues: [],
      availableQuantity: null,
    },
  ],
  subtotalAmount: 5997,
  expiresAt: null,
};

/** 応答を 1 つ返す fetch。本文は 1 度しか読めないため関数で受け取る。 */
function stubFetch(respond: () => Response) {
  const fetchImpl = vi.fn<typeof fetch>(async () => respond());

  vi.stubGlobal("fetch", fetchImpl);

  return fetchImpl;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  getAccessToken.mockResolvedValue(null);
  readCartSession.mockResolvedValue(null);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getMyCart", () => {
  // ----- 正常系 -----
  it("契約の応答を表示用の明細へ写す", async () => {
    stubFetch(() => jsonResponse(wireCart));

    await expect(getMyCart()).resolves.toEqual({
      lines: [
        {
          productId: PRODUCT_ID,
          name: "ワイヤレスイヤホン",
          unitPrice: "19.99",
          quantity: 3,
          issues: [],
          availableQuantity: null,
        },
      ],
      subtotalAmount: 5997,
    });
  });

  it("欠けている名前と単価を null として渡す", async () => {
    stubFetch(() =>
      jsonResponse({
        ...wireCart,
        items: [{ productId: PRODUCT_ID, quantity: 2, issues: ["notFound"] }],
      }),
    );

    const cart = await getMyCart();

    expect(cart.lines[0]).toMatchObject({ name: null, unitPrice: null, availableQuantity: null });
  });

  it("ゲストの識別子を持っているとき、ヘッダへ載せて送る", async () => {
    readCartSession.mockResolvedValue(TOKEN);

    const fetchImpl = stubFetch(() => jsonResponse(wireCart));

    await getMyCart();

    expect(fetchImpl.mock.calls[0]?.[1]).toMatchObject({
      headers: expect.objectContaining({ "X-Cart-Session": TOKEN }),
    });
  });

  it("識別子を持っていないとき、認証なしで送る", async () => {
    const fetchImpl = stubFetch(() => jsonResponse(wireCart));

    await getMyCart();

    const headers = fetchImpl.mock.calls[0]?.[1]?.headers;

    expect(headers).not.toHaveProperty("X-Cart-Session");
    expect(headers).not.toHaveProperty("Authorization");
  });

  it("認証済みのとき Bearer を載せる", async () => {
    getAccessToken.mockResolvedValue("access-token");

    const fetchImpl = stubFetch(() => jsonResponse(wireCart));

    await getMyCart();

    expect(fetchImpl.mock.calls[0]?.[1]).toMatchObject({
      headers: expect.objectContaining({ Authorization: "Bearer access-token" }),
    });
  });

  // ----- 異常系 -----
  it("契約と違う応答のとき internal として投げる", async () => {
    stubFetch(() => jsonResponse({ items: "壊れた形" }));

    await expect(getMyCart()).rejects.toSatisfy(
      (error: unknown) => findAppError(error)?.kind === ErrorKind.INTERNAL,
    );
  });
});

describe("setMyCartItem", () => {
  // ----- 正常系 -----
  it("数量を本文へ載せて設定を送る", async () => {
    const fetchImpl = stubFetch(() => jsonResponse(wireCart));

    await setMyCartItem(PRODUCT_ID, 3);

    const [url, init] = fetchImpl.mock.calls[0] ?? [];

    expect(String(url)).toContain(`/v1/carts/me/items/${PRODUCT_ID}`);
    expect(init).toMatchObject({ method: "PUT", body: JSON.stringify({ quantity: 3 }) });
  });

  it("発行された識別子を cookie へ引き取る", async () => {
    stubFetch(() =>
      jsonResponse({ ...wireCart, sessionToken: TOKEN, expiresAt: "2026-09-14T16:31:59+09:00" }),
    );

    await setMyCartItem(PRODUCT_ID, 1);

    expect(storeCartSession).toHaveBeenCalledWith(TOKEN, new Date("2026-09-14T16:31:59+09:00"));
  });

  it("識別子が載っていない応答では cookie を触らない", async () => {
    stubFetch(() => jsonResponse(wireCart));

    await setMyCartItem(PRODUCT_ID, 1);

    expect(storeCartSession).not.toHaveBeenCalled();
  });

  it("有効期限が判らないまま識別子だけ載っているとき、寿命を渡さない", async () => {
    stubFetch(() => jsonResponse({ ...wireCart, sessionToken: TOKEN, expiresAt: null }));

    await setMyCartItem(PRODUCT_ID, 1);

    expect(storeCartSession).toHaveBeenCalledWith(TOKEN, null);
  });

  // ----- 異常系 -----
  it("契約が拒んだとき invalid-argument として投げる", async () => {
    stubFetch(() => jsonResponse({ message: "範囲外です" }, 400));

    await expect(setMyCartItem(PRODUCT_ID, 0)).rejects.toSatisfy(
      (error: unknown) => findAppError(error)?.kind === ErrorKind.INVALID_ARGUMENT,
    );
  });
});

describe("removeMyCartItem", () => {
  // ----- 正常系 -----
  it("対象の明細へ削除を送る", async () => {
    const fetchImpl = stubFetch(() => new Response(null, { status: 204 }));

    await removeMyCartItem(PRODUCT_ID);

    const [url, init] = fetchImpl.mock.calls[0] ?? [];

    expect(String(url)).toContain(`/v1/carts/me/items/${PRODUCT_ID}`);
    expect(init).toMatchObject({ method: "DELETE" });
  });

  // ----- 異常系 -----
  it("上流が落ちているとき unavailable として投げる", async () => {
    stubFetch(() => new Response(null, { status: 503 }));

    await expect(removeMyCartItem(PRODUCT_ID)).rejects.toSatisfy(
      (error: unknown) => findAppError(error)?.kind === ErrorKind.UNAVAILABLE,
    );
  });
});

describe("clearMyCart", () => {
  // ----- 正常系 -----
  it("カートを空にする要求を送る", async () => {
    const fetchImpl = stubFetch(() => new Response(null, { status: 204 }));

    await clearMyCart();

    const [url, init] = fetchImpl.mock.calls[0] ?? [];

    expect(String(url)).toContain("/v1/carts/me");
    expect(init).toMatchObject({ method: "DELETE" });
  });
});

describe("mergeGuestCart", () => {
  // ----- 正常系 -----
  it("引き継ぎの結果を表示用の形へ写す", async () => {
    readCartSession.mockResolvedValue(TOKEN);
    getAccessToken.mockResolvedValue("access-token");
    stubFetch(() => jsonResponse({ clamped: [PRODUCT_ID], dropped: [] }));

    await expect(mergeGuestCart()).resolves.toEqual({
      clampedProductIds: [PRODUCT_ID],
      droppedProductIds: [],
    });
  });

  it("成功したとき、引き継ぎ元の識別子を破棄する", async () => {
    readCartSession.mockResolvedValue(TOKEN);
    getAccessToken.mockResolvedValue("access-token");
    stubFetch(() => jsonResponse({ clamped: [], dropped: [] }));

    await mergeGuestCart();

    expect(clearCartSession).toHaveBeenCalledOnce();
  });

  it("引き継ぐ識別子が無いとき、何も送らず null を返す", async () => {
    const fetchImpl = stubFetch(() => jsonResponse({ clamped: [], dropped: [] }));

    await expect(mergeGuestCart()).resolves.toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  // ----- 異常系 -----
  it("失敗したとき、識別子を残したまま投げる", async () => {
    readCartSession.mockResolvedValue(TOKEN);
    getAccessToken.mockResolvedValue("access-token");
    stubFetch(() => jsonResponse({ message: "権限がありません" }, 401));

    await expect(mergeGuestCart()).rejects.toSatisfy(
      (error: unknown) => findAppError(error)?.kind === ErrorKind.UNAUTHENTICATED,
    );
    expect(clearCartSession).not.toHaveBeenCalled();
  });
});
