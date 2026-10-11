// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { adminProductDiscontinuePath } from "../../paths";
import { DISCONTINUE_PRODUCT, REMAINING_PURCHASES } from "./discontinue.fixture";

const { getInProgressPurchasesOfProduct, logger } = vi.hoisted(() => ({
  getInProgressPurchasesOfProduct: vi.fn(),
  logger: { warn: vi.fn() },
}));

vi.mock("@/adapters/server/api/purchases", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/adapters/server/api/purchases")>()),
  getInProgressPurchasesOfProduct,
}));
vi.mock("@/logging/logging.server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/logging/logging.server")>()),
  getLogger: () => logger,
}));

import { RemainingPurchasesSection } from "./remaining-purchases-section";

const ID = DISCONTINUE_PRODUCT.id;
const EXPECTED: number = REMAINING_PURCHASES.length;
const PARTIAL_NOTE = /ほかにも進行中の購入があり/;

function section(expectedCount = EXPECTED) {
  return RemainingPurchasesSection({ expectedCount, productId: ID });
}

beforeEach(() => {
  getInProgressPurchasesOfProduct.mockReset();
  logger.warn.mockReset();
  logger.warn.mockImplementation(() => undefined);
  getInProgressPurchasesOfProduct.mockResolvedValue({
    items: REMAINING_PURCHASES,
    nextCursor: null,
  });
});

describe("RemainingPurchasesSection", () => {
  // ----- 読めたとき -----
  it("対象の商品の進行中の購入を、1 画面で見渡せる件数だけ読む", async () => {
    await section();

    expect(getInProgressPurchasesOfProduct).toHaveBeenCalledWith(ID, 20);
  });

  it("見積もりの件数ちょうどが並び、続きも無ければ全件として並べる", async () => {
    render(await section(EXPECTED));

    expect(screen.getAllByRole("listitem")).toHaveLength(EXPECTED);
    expect(screen.queryByText(PARTIAL_NOTE)).not.toBeInTheDocument();
  });

  it("見積もりの件数より多く並んでも、続きが無ければ全件として並べる", async () => {
    render(await section(EXPECTED - 1));

    expect(screen.queryByText(PARTIAL_NOTE)).not.toBeInTheDocument();
  });

  it("並びが見積もりの件数に 1 件でも届かなければ、全件ではないと添える", async () => {
    render(await section(EXPECTED + 1));

    expect(screen.getByText(PARTIAL_NOTE)).toBeInTheDocument();
  });

  it("続きがあれば、件数が届いていても全件ではないと添える", async () => {
    getInProgressPurchasesOfProduct.mockResolvedValue({
      items: REMAINING_PURCHASES,
      nextCursor: "c1",
    });

    render(await section(EXPECTED));

    expect(screen.getByText(PARTIAL_NOTE)).toBeInTheDocument();
  });

  it("読めたときは記録を残さない", async () => {
    await section();

    expect(logger.warn).not.toHaveBeenCalled();
  });

  // ----- 読めなかったとき -----
  it("失敗を境界へ投げず、この区画で読めなかったことと取り直す先を出す", async () => {
    getInProgressPurchasesOfProduct.mockRejectedValue(new Error("接続できません"));

    render(await section());

    expect(screen.getByText("残っている購入を読み込めませんでした。")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "読み込み直す" })).toHaveAttribute(
      "href",
      adminProductDiscontinuePath(ID),
    );
  });

  it("読めなかったことを、原因を添えて警告として記録する", async () => {
    getInProgressPurchasesOfProduct.mockRejectedValue(new Error("接続できません"));

    await section();

    expect(logger.warn).toHaveBeenCalledWith("廃番を拒ませている購入を読めませんでした", {
      cause: "Error: 接続できません",
    });
  });

  it("記録に失敗しても、読めなかったことの表示は崩さない", async () => {
    getInProgressPurchasesOfProduct.mockRejectedValue(new Error("接続できません"));
    logger.warn.mockImplementation(() => {
      throw new Error("記録先に届きません");
    });

    render(await section());

    expect(screen.getByText("残っている購入を読み込めませんでした。")).toBeInTheDocument();
  });
});
