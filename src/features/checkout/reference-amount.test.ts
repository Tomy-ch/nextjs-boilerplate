import { beforeEach, describe, expect, it, vi } from "vitest";

import { createAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";

const { convertToReferenceAmount, warn } = vi.hoisted(() => ({
  convertToReferenceAmount: vi.fn(),
  warn: vi.fn(),
}));

vi.mock("@/adapters/server/api/exchange-rates", () => ({ convertToReferenceAmount }));
vi.mock("@/logging/logging.server", () => ({
  getLogger: () => ({ warn }),
  reportQuietly: (run: () => void) => run(),
}));

import { SUBTOTAL_REFERENCE } from "./checkout.fixture";
import { readReferenceAmount } from "./reference-amount";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("readReferenceAmount", () => {
  // ----- 正常系 -----
  it("引けた参考換算額をそのまま返す", async () => {
    convertToReferenceAmount.mockResolvedValue(SUBTOTAL_REFERENCE);

    expect(await readReferenceAmount(18_897)).toEqual(SUBTOTAL_REFERENCE);
    expect(convertToReferenceAmount).toHaveBeenCalledWith(18_897);
  });

  it("換算できなかった応答をそのまま伝える", async () => {
    convertToReferenceAmount.mockResolvedValue(null);

    expect(await readReferenceAmount(18_897)).toBeNull();
  });

  // ----- 異常系 -----
  it("取得に失敗しても投げず、読めなかったことを null で表す", async () => {
    convertToReferenceAmount.mockRejectedValue(createAppError(ErrorKind.UNAVAILABLE));

    expect(await readReferenceAmount(18_897)).toBeNull();
  });

  it("読めなかったことを記録に残す", async () => {
    convertToReferenceAmount.mockRejectedValue(createAppError(ErrorKind.UNAVAILABLE));

    await readReferenceAmount(18_897);

    expect(warn).toHaveBeenCalledWith("参考換算額を読めませんでした", expect.anything());
  });
});
