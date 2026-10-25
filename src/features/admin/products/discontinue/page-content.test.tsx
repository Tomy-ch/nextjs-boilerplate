// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

import { idleActionState } from "@/model/action-state";

import { adminProductDiscontinuePath } from "../../paths";
import {
  BLOCKED_IMPACT,
  DISCONTINUE_PRODUCT,
  DISCONTINUED_AT,
  OPEN_IMPACT,
} from "./discontinue.fixture";
import type { DiscontinueProductAction } from "./form-state";
import { RemainingPurchasesSection } from "./remaining-purchases-section";
import { DiscontinueRemainingPurchases } from "./ui/remaining-purchases/remaining-purchases";
import { AdminProductDiscontinueView } from "./view";

const { getProductDiscontinueImpact, getProductIncludingUnpublished } = vi.hoisted(() => ({
  getProductDiscontinueImpact: vi.fn(),
  getProductIncludingUnpublished: vi.fn(),
}));

vi.mock("@/adapters/server/api/products", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/adapters/server/api/products")>()),
  getProductDiscontinueImpact,
  getProductIncludingUnpublished,
}));

import { AdminProductDiscontinuePageContent } from "./page-content";

const ID = DISCONTINUE_PRODUCT.id;

const PRODUCT = {
  ...DISCONTINUE_PRODUCT,
  description: null,
  price: "19.99",
  quantity: 128,
  stockWarningThreshold: null,
  status: { id: "status-1", name: "在庫あり" },
  category: { id: "category-1", name: "電子機器" },
  publishedAt: null,
  discontinuedAt: null,
  imagePaths: [],
  version: 4,
};

const discontinueAction: DiscontinueProductAction = () => Promise.resolve(idleActionState());

/** 画面を組み立てる。返るのは island の要素で、その props が island へ渡るもの。 */
function assemble() {
  return AdminProductDiscontinuePageContent({ discontinueAction, id: ID });
}

beforeEach(() => {
  getProductIncludingUnpublished.mockReset();
  getProductDiscontinueImpact.mockReset();
  getProductIncludingUnpublished.mockResolvedValue(PRODUCT);
  getProductDiscontinueImpact.mockResolvedValue(OPEN_IMPACT);
});

describe("AdminProductDiscontinuePageContent", () => {
  // ----- 実行できるとき -----
  it("未公開も含めて読む口で商品を取り、名前と識別子だけを island へ渡す", async () => {
    const element = await assemble();

    expect(getProductIncludingUnpublished).toHaveBeenCalledWith(ID);
    expect(element.type).toBe(AdminProductDiscontinueView);
    expect(element.props.product).toEqual({ id: ID, name: DISCONTINUE_PRODUCT.name });
  });

  it("廃番でなければ見積もりを取り、実行できる立ち位置として渡す", async () => {
    const element = await assemble();

    expect(getProductDiscontinueImpact).toHaveBeenCalledWith(ID);
    expect(element.props.standing).toEqual({ kind: "open", impact: OPEN_IMPACT });
  });

  it("送信先を受け取ったまま island へ渡す", async () => {
    const element = await assemble();

    expect(element.props.discontinueAction).toBe(discontinueAction);
  });

  it("取り直しで island を作り直させないよう、鍵を付けない", async () => {
    const element = await assemble();

    expect(element.key).toBeNull();
  });

  it("進行中の購入が無ければ、残っている購入の区画を渡さない", async () => {
    const element = await assemble();

    expect(element.props.remainingPurchases).toBeNull();
  });

  // ----- 進行中の購入が残っているとき -----
  it("見積もりの件数と商品を、別の待機で読む区画へ渡す", async () => {
    getProductDiscontinueImpact.mockResolvedValue(BLOCKED_IMPACT);

    const element = await assemble();
    const boundary = element.props.remainingPurchases;

    expect(boundary.props.children.type).toBe(RemainingPurchasesSection);
    expect(boundary.props.children.props).toEqual({
      expectedCount: BLOCKED_IMPACT.inProgressPurchaseCount,
      productId: ID,
    });
  });

  it("区画を待っている間は、この画面自身へ取り直す先を持った待機の姿を出す", async () => {
    getProductDiscontinueImpact.mockResolvedValue(BLOCKED_IMPACT);

    const element = await assemble();
    const boundary = element.props.remainingPurchases;

    expect(boundary.props.fallback.type).toBe(DiscontinueRemainingPurchases);
    expect(boundary.props.fallback.props).toEqual({
      reloadHref: adminProductDiscontinuePath(ID),
      state: { status: "loading" },
    });
  });

  // ----- 既に廃番のとき -----
  it("見積もりを取らず、廃番の日時を持った立ち位置として渡す", async () => {
    getProductIncludingUnpublished.mockResolvedValue({
      ...PRODUCT,
      discontinuedAt: DISCONTINUED_AT,
    });

    const element = await assemble();

    expect(getProductDiscontinueImpact).not.toHaveBeenCalled();
    expect(element.props.standing).toEqual({
      kind: "discontinued",
      discontinuedAt: DISCONTINUED_AT,
    });
    expect(element.props.remainingPurchases).toBeNull();
  });

  // ----- 取得に失敗したとき -----
  it("商品を取れなければ、その失敗を境界へ渡す", async () => {
    getProductIncludingUnpublished.mockRejectedValue(new Error("対象が見つかりません"));

    await expect(assemble()).rejects.toThrow("対象が見つかりません");
  });

  it("見積もりを取れなければ、その失敗を境界へ渡す", async () => {
    getProductDiscontinueImpact.mockRejectedValue(new Error("見積もりを取れません"));

    await expect(assemble()).rejects.toThrow("見積もりを取れません");
  });
});
