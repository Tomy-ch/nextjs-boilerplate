import { beforeEach, describe, expect, it, vi } from "vitest";

import { createAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";

const { getMyCart, warn } = vi.hoisted(() => ({ getMyCart: vi.fn(), warn: vi.fn() }));

vi.mock("@/adapters/server/api/cart", () => ({ getMyCart }));
vi.mock("@/logging/logging.server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/logging/logging.server")>()),
  getLogger: () => ({ warn }),
}));

import { CART } from "./cart.fixture";
import { readShellCart } from "./shell-cart";

beforeEach(() => {
  vi.clearAllMocks();
  getMyCart.mockResolvedValue(CART);
});

describe("readShellCart", () => {
  // ----- 正常系 -----
  it("読めたカートをそのまま返す", async () => {
    await expect(readShellCart()).resolves.toBe(CART);
  });

  // ----- 異常系 -----
  it("読めなかったとき、投げずに null を返す", async () => {
    getMyCart.mockRejectedValue(createAppError(ErrorKind.UNAVAILABLE));

    await expect(readShellCart()).resolves.toBeNull();
  });

  it("読めなかったことを記録に残す", async () => {
    getMyCart.mockRejectedValue(createAppError(ErrorKind.UNAVAILABLE));

    await readShellCart();

    expect(warn).toHaveBeenCalledWith(expect.any(String), { cause: expect.any(String) });
  });

  it("記録そのものが失敗しても null を返す", async () => {
    getMyCart.mockRejectedValue(createAppError(ErrorKind.UNAVAILABLE));
    warn.mockImplementation(() => {
      throw new Error("logger は初期化されていません");
    });

    await expect(readShellCart()).resolves.toBeNull();
  });
});
