import { beforeEach, describe, expect, it, vi } from "vitest";

import { createAppError } from "@/errors/app-error";
import { getDefaultErrorMeta } from "@/errors/error-catalog";
import { ErrorKind } from "@/errors/error-kind";
import { withErrorDetails } from "@/errors/error-meta";
import {
  DISCONTINUE_CONFLICT_MESSAGE,
  DISCONTINUE_TARGET_LOST_MESSAGE,
} from "@/features/admin/products/discontinue/form-state";
import { PRODUCT_VERSION_CONFLICT_MESSAGE } from "@/features/admin/products/form-state";
import { idleActionState } from "@/model/action-state";
import { SESSION_ROLE } from "@/model/session";

const {
  adjustProductStock,
  createProduct,
  discontinueProduct,
  redirect,
  revalidatePath,
  updateProduct,
  uploadProductImage,
  verifySession,
} = vi.hoisted(() => ({
  adjustProductStock: vi.fn(),
  createProduct: vi.fn(),
  discontinueProduct: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  revalidatePath: vi.fn(),
  updateProduct: vi.fn(),
  uploadProductImage: vi.fn(),
  verifySession: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/adapters/server/auth/session", () => ({ verifySession }));
vi.mock("@/config/http/http.client", () => ({ MAX_UPLOAD_BYTES: 4 * 1024 * 1024 }));
vi.mock("@/adapters/server/api/products", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/adapters/server/api/products")>()),
  adjustProductStock,
  createProduct,
  discontinueProduct,
  updateProduct,
  uploadProductImage,
}));

import {
  adjustProductStockAction,
  createProductAction,
  discontinueProductAction,
  updateProductAction,
  uploadProductImageAction,
} from "./actions";

const MAX = 4 * 1024 * 1024;
const PRODUCT_ID = "0195f0c2-0000-7000-8000-000000000001";

function asAdmin() {
  verifySession.mockResolvedValue({ subject: "admin", role: SESSION_ROLE.admin });
}

/** 形の上で通る最小の入力。個々のケースは、ここから 1 項目だけ崩す。 */
function productForm(overrides: Readonly<Record<string, string>> = {}): FormData {
  const form = new FormData();
  const values: Record<string, string> = {
    id: PRODUCT_ID,
    name: "ワイヤレスイヤホン",
    price: "19.99",
    quantity: "3",
    categoryId: "01936f6d-0000-7000-8000-000000000001",
    statusId: "01936f6d-0000-7000-8000-000000000101",
    version: "4",
    ...overrides,
  };

  for (const [key, value] of Object.entries(values)) {
    if (value !== "") form.append(key, value);
  }

  return form;
}

function imageForm(file: File): FormData {
  const form = new FormData();
  form.append("images", file);

  return form;
}

beforeEach(() => {
  vi.clearAllMocks();
  asAdmin();
});

describe("uploadProductImageAction", () => {
  // ----- 正常系 -----
  it("保存されたオブジェクトキーを返す", async () => {
    uploadProductImage.mockResolvedValue("products/a.png");

    const state = await uploadProductImageAction(
      idleActionState(),
      imageForm(new File(["x"], "a.png", { type: "image/png" })),
    );

    expect(state).toEqual({ status: "success", value: "products/a.png" });
  });

  // ----- 異常系 -----
  it("役割が足りなければ送らない", async () => {
    verifySession.mockResolvedValue({ subject: "user", role: SESSION_ROLE.user });

    const state = await uploadProductImageAction(
      idleActionState(),
      imageForm(new File(["x"], "a.png", { type: "image/png" })),
    );

    expect(state.status).toBe("error");
    expect(uploadProductImage).not.toHaveBeenCalled();
  });

  it("画像が選ばれていなければ断る", async () => {
    const state = await uploadProductImageAction(idleActionState(), new FormData());

    expect(state).toMatchObject({ status: "error", formError: "画像が選ばれていません。" });
  });

  it("空のファイルを断る", async () => {
    const state = await uploadProductImageAction(
      idleActionState(),
      imageForm(new File([], "a.png", { type: "image/png" })),
    );

    expect(state).toMatchObject({ status: "error", formError: "画像が選ばれていません。" });
  });

  it("受け付けない形式を断る", async () => {
    const state = await uploadProductImageAction(
      idleActionState(),
      imageForm(new File(["x"], "a.gif", { type: "image/gif" })),
    );

    expect(state).toMatchObject({
      status: "error",
      formError: "PNG / JPEG / WebP のいずれかを選んでください。",
    });
    expect(uploadProductImage).not.toHaveBeenCalled();
  });

  it("上限を超えた大きさを、送る前に断る", async () => {
    const oversized = new File([new Uint8Array(MAX + 1)], "a.png", { type: "image/png" });

    const state = await uploadProductImageAction(idleActionState(), imageForm(oversized));

    expect(state).toMatchObject({
      status: "error",
      formError: "画像が大きすぎます。もっと小さいものを選んでください。",
    });
    expect(uploadProductImage).not.toHaveBeenCalled();
  });

  it("送れなかったことを分類済みの結果として返す", async () => {
    uploadProductImage.mockRejectedValue(createAppError(ErrorKind.UNAVAILABLE));

    const state = await uploadProductImageAction(
      idleActionState(),
      imageForm(new File(["x"], "a.png", { type: "image/png" })),
    );

    expect(state.status).toBe("error");
  });
});

describe("createProductAction", () => {
  // ----- 正常系 -----
  it("成立したら一覧へ送る", async () => {
    createProduct.mockResolvedValue({});

    await expect(createProductAction(idleActionState(), productForm())).rejects.toThrow(
      "NEXT_REDIRECT:/admin/products",
    );
  });

  // ----- 異常系 -----
  it("役割が足りなければ作らない", async () => {
    verifySession.mockResolvedValue(null);

    const state = await createProductAction(idleActionState(), productForm());

    expect(state.status).toBe("error");
    expect(createProduct).not.toHaveBeenCalled();
  });

  it("形の上での誤りは、項目ごとに返す", async () => {
    const state = await createProductAction(idleActionState(), productForm({ name: "" }));

    expect(state).toMatchObject({
      status: "error",
      formError: null,
      fieldErrors: { name: ["商品名を入力してください。"] },
    });
    expect(createProduct).not.toHaveBeenCalled();
  });

  it("作れなかったことを分類済みの結果として返す", async () => {
    createProduct.mockRejectedValue(createAppError(ErrorKind.VALIDATION));

    const state = await createProductAction(idleActionState(), productForm());

    expect(state.status).toBe("error");
  });
});

describe("updateProductAction", () => {
  // ----- 正常系 -----
  it("成立したら一覧へ送る", async () => {
    updateProduct.mockResolvedValue({});

    await expect(updateProductAction(idleActionState(), productForm())).rejects.toThrow(
      "NEXT_REDIRECT:/admin/products",
    );
  });

  it("読み込んだ時点の版を添えて送る", async () => {
    updateProduct.mockResolvedValue({});

    await expect(updateProductAction(idleActionState(), productForm())).rejects.toThrow();
    expect(updateProduct).toHaveBeenCalledWith(PRODUCT_ID, expect.objectContaining({ version: 4 }));
  });

  // ----- 異常系 -----
  it("役割が足りなければ更新しない", async () => {
    verifySession.mockResolvedValue(null);

    const state = await updateProductAction(idleActionState(), productForm());

    expect(state.status).toBe("error");
    expect(updateProduct).not.toHaveBeenCalled();
  });

  it("形の上での誤りは、項目ごとに返す", async () => {
    const state = await updateProductAction(idleActionState(), productForm({ price: "abc" }));

    expect(state).toMatchObject({ status: "error", formError: null });
    expect(updateProduct).not.toHaveBeenCalled();
  });

  it("版が無ければ、編集の前提が失われたことを全体の誤りとして返す", async () => {
    const state = await updateProductAction(idleActionState(), productForm({ version: "" }));

    expect(state).toMatchObject({
      status: "error",
      formError: "編集の前提が失われています。画面を開き直してください。",
    });
    expect(updateProduct).not.toHaveBeenCalled();
  });

  it("どの商品かが判らなければ更新しない", async () => {
    const state = await updateProductAction(idleActionState(), productForm({ id: "" }));

    expect(state).toMatchObject({ status: "error", formError: "入力内容を確認してください。" });
    expect(updateProduct).not.toHaveBeenCalled();
  });

  it("版が食い違ったときは、読み込み直せば解けるものとして伝える", async () => {
    updateProduct.mockRejectedValue(createAppError(ErrorKind.CONFLICT));

    const state = await updateProductAction(idleActionState(), productForm());

    expect(state).toMatchObject({ status: "error", formError: PRODUCT_VERSION_CONFLICT_MESSAGE });
  });

  it("版の食い違い以外は、分類ごとの文言で返す", async () => {
    updateProduct.mockRejectedValue(createAppError(ErrorKind.UNAUTHENTICATED));

    const state = await updateProductAction(idleActionState(), productForm());

    expect(state.status).toBe("error");
    expect(state.status === "error" && state.formError).not.toBe(PRODUCT_VERSION_CONFLICT_MESSAGE);
  });
});

/** 形の上で通る最小の在庫の入力。個々のケースは、ここから 1 項目だけ崩す。 */
function stockForm(overrides: Readonly<Record<string, string>> = {}): FormData {
  const form = new FormData();
  const values: Record<string, string> = {
    productId: PRODUCT_ID,
    direction: "replenish",
    quantity: "50",
    ...overrides,
  };

  for (const [key, value] of Object.entries(values)) {
    if (value !== "") form.append(key, value);
  }

  return form;
}

describe("adjustProductStockAction", () => {
  // ----- 正常系 -----
  it("補充を正の増減量として送る", async () => {
    await expect(adjustProductStockAction(idleActionState(), stockForm())).rejects.toThrow(
      "NEXT_REDIRECT:/admin/products",
    );

    expect(adjustProductStock).toHaveBeenCalledWith(PRODUCT_ID, 50);
  });

  it("差し引きを負の増減量として送る", async () => {
    await expect(
      adjustProductStockAction(idleActionState(), stockForm({ direction: "deduct" })),
    ).rejects.toThrow("NEXT_REDIRECT:/admin/products");

    expect(adjustProductStock).toHaveBeenCalledWith(PRODUCT_ID, -50);
  });

  it("成立したら一覧へ送る", async () => {
    await expect(adjustProductStockAction(idleActionState(), stockForm())).rejects.toThrow(
      "NEXT_REDIRECT:/admin/products",
    );
  });

  // ----- 異常系 -----
  it("役割が足りなければ送らずに拒む", async () => {
    verifySession.mockResolvedValue({ subject: "user", role: SESSION_ROLE.user });

    const state = await adjustProductStockAction(idleActionState(), stockForm());

    expect(state).toMatchObject({ status: "error", kind: ErrorKind.PERMISSION_DENIED });
    expect(adjustProductStock).not.toHaveBeenCalled();
  });

  it("量が読めなければ、その欄あての文言を返して送らない", async () => {
    const state = await adjustProductStockAction(idleActionState(), stockForm({ quantity: "0" }));

    expect(state).toMatchObject({
      status: "error",
      formError: null,
      fieldErrors: { quantity: ["1 以上の整数を入力してください。"] },
    });
    expect(adjustProductStock).not.toHaveBeenCalled();
  });

  it("対象が届かなければ、開き直す案内を返して送らない", async () => {
    const state = await adjustProductStockAction(idleActionState(), stockForm({ productId: "" }));

    expect(state).toMatchObject({
      status: "error",
      formError: "対象の商品が判りません。画面を開き直してください。",
    });
    expect(adjustProductStock).not.toHaveBeenCalled();
  });

  it("並行して動かされて拒まれたら、その分類のまま返す", async () => {
    adjustProductStock.mockRejectedValue(createAppError(ErrorKind.CONFLICT));

    const state = await adjustProductStockAction(idleActionState(), stockForm());

    expect(state).toMatchObject({ status: "error", kind: ErrorKind.CONFLICT });
  });

  it("増減後の在庫が範囲を外れて拒まれたら、量の欄あての文言を返す", async () => {
    adjustProductStock.mockRejectedValue(createAppError(ErrorKind.VALIDATION));

    const state = await adjustProductStockAction(idleActionState(), stockForm());

    expect(state).toMatchObject({
      status: "error",
      formError: null,
      fieldErrors: { quantity: ["動かした後の在庫が扱える範囲を外れます。量を見直してください。"] },
      kind: ErrorKind.VALIDATION,
    });
  });

  it("一時的に受け付けられないときは、時間を空ける旨の分類で返す", async () => {
    adjustProductStock.mockRejectedValue(createAppError(ErrorKind.UNAVAILABLE));

    const state = await adjustProductStockAction(idleActionState(), stockForm());

    expect(state).toMatchObject({ status: "error", kind: ErrorKind.UNAVAILABLE });
  });
});

const IDEMPOTENCY_KEY = "0195f0c2-0000-7000-8000-0000000000aa";

const DISCONTINUE_RESULT = {
  discontinuedAt: "2026-08-14T10:30:00.000Z",
  affectedCartCount: 43,
  affectedUserCount: 38,
  issuedCouponCount: 38,
};

/** 形の上で通る最小の廃番の指示。個々のケースは、ここから 1 項目だけ崩す。 */
function discontinueForm(overrides: Readonly<Record<string, string>> = {}): FormData {
  const form = new FormData();
  const values: Record<string, string> = {
    productId: PRODUCT_ID,
    idempotencyKey: IDEMPOTENCY_KEY,
    couponDiscountRate: "10",
    couponValidityDays: "30",
    confirmed: "true",
    ...overrides,
  };

  for (const [key, value] of Object.entries(values)) {
    if (value !== "") form.append(key, value);
  }

  return form;
}

describe("discontinueProductAction", () => {
  // ----- 正常系 -----
  it("読んだ対象・契約の形の条件・冪等キーで廃番を送る", async () => {
    discontinueProduct.mockResolvedValue(DISCONTINUE_RESULT);

    await discontinueProductAction(
      idleActionState(),
      discontinueForm({ couponDiscountRate: "12.5" }),
    );

    expect(discontinueProduct).toHaveBeenCalledWith(
      PRODUCT_ID,
      { couponDiscountRate: "0.125", couponValidityDays: 30 },
      IDEMPOTENCY_KEY,
    );
  });

  it("成立したら移らずに、実行の応答をそのまま成功の値として返す", async () => {
    discontinueProduct.mockResolvedValue(DISCONTINUE_RESULT);

    const state = await discontinueProductAction(idleActionState(), discontinueForm());

    expect(state).toEqual({ status: "success", value: DISCONTINUE_RESULT });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("成立したら、この画面を取り直させる", async () => {
    discontinueProduct.mockResolvedValue(DISCONTINUE_RESULT);

    await discontinueProductAction(idleActionState(), discontinueForm());

    expect(revalidatePath).toHaveBeenCalledWith(`/admin/products/${PRODUCT_ID}/discontinue`);
  });

  // ----- 異常系 -----
  it("役割が足りなければ送らずに拒み、取り直させもしない", async () => {
    verifySession.mockResolvedValue({ subject: "user", role: SESSION_ROLE.user });

    const state = await discontinueProductAction(idleActionState(), discontinueForm());

    expect(state).toMatchObject({ status: "error", kind: ErrorKind.PERMISSION_DENIED });
    expect(discontinueProduct).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it.each([
    { label: "確認の合図", name: "confirmed" },
    { label: "冪等キー", name: "idempotencyKey" },
    { label: "対象", name: "productId" },
  ])("$label が届かなければ、開き直す案内を返し、送らず取り直させもしない", async ({ name }) => {
    const state = await discontinueProductAction(
      idleActionState(),
      discontinueForm({ [name]: "" }),
    );

    expect(state).toMatchObject({ status: "error", formError: DISCONTINUE_TARGET_LOST_MESSAGE });
    expect(discontinueProduct).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("条件が読めなければ、その欄あての文言を返し、送らず取り直させもしない", async () => {
    const state = await discontinueProductAction(
      idleActionState(),
      discontinueForm({ couponValidityDays: "0" }),
    );

    expect(state).toMatchObject({ status: "error", formError: null });
    expect(state.status === "error" && Object.keys(state.fieldErrors ?? {})).toEqual([
      "couponValidityDays",
    ]);
    expect(discontinueProduct).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("進行中の購入が残って拒まれたら、この画面でしか言えない文言で返し、画面を取り直させる", async () => {
    discontinueProduct.mockRejectedValue(createAppError(ErrorKind.CONFLICT));

    const state = await discontinueProductAction(idleActionState(), discontinueForm());

    expect(state).toMatchObject({
      status: "error",
      formError: DISCONTINUE_CONFLICT_MESSAGE,
      kind: ErrorKind.CONFLICT,
    });
    expect(revalidatePath).toHaveBeenCalledWith(`/admin/products/${PRODUCT_ID}/discontinue`);
  });

  it("接続先が条件の項目を名指しして拒んだら、その欄あてに返し、全体の文言は出さない", async () => {
    discontinueProduct.mockRejectedValue(
      createAppError(ErrorKind.VALIDATION, {
        cause: withErrorDetails(new Error("拒否"), ["couponDiscountRate"]),
      }),
    );

    const state = await discontinueProductAction(idleActionState(), discontinueForm());

    expect(state).toEqual({
      status: "error",
      formError: null,
      fieldErrors: {
        couponDiscountRate: ["値引き率は受け付けられませんでした。入力し直してください。"],
      },
      kind: ErrorKind.VALIDATION,
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("名指しの無い検証の失敗は、分類の既定の文言で返す", async () => {
    discontinueProduct.mockRejectedValue(createAppError(ErrorKind.VALIDATION));

    const state = await discontinueProductAction(idleActionState(), discontinueForm());

    expect(state).toEqual({
      status: "error",
      formError: getDefaultErrorMeta(ErrorKind.VALIDATION).message,
      fieldErrors: undefined,
      kind: ErrorKind.VALIDATION,
    });
  });

  it("一時的に受け付けられないときは、取り直させずに分類のまま返す", async () => {
    discontinueProduct.mockRejectedValue(createAppError(ErrorKind.UNAVAILABLE));

    const state = await discontinueProductAction(idleActionState(), discontinueForm());

    expect(state).toMatchObject({
      status: "error",
      formError: getDefaultErrorMeta(ErrorKind.UNAVAILABLE).message,
      kind: ErrorKind.UNAVAILABLE,
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
