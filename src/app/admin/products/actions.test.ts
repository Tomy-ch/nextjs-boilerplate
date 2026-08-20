import { beforeEach, describe, expect, it, vi } from "vitest";

import { createAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import { PRODUCT_VERSION_CONFLICT_MESSAGE } from "@/features/admin/products/form-state";
import { idleActionState } from "@/model/action-state";
import { SESSION_ROLE } from "@/model/session";

const { createProduct, redirect, updateProduct, updateTag, uploadProductImage, verifySession } =
  vi.hoisted(() => ({
    createProduct: vi.fn(),
    redirect: vi.fn((path: string) => {
      throw new Error(`NEXT_REDIRECT:${path}`);
    }),
    updateProduct: vi.fn(),
    updateTag: vi.fn(),
    uploadProductImage: vi.fn(),
    verifySession: vi.fn(),
  }));

vi.mock("next/cache", () => ({ updateTag }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/adapters/server/auth/session", () => ({ verifySession }));
vi.mock("@/config/http/http.client", () => ({ MAX_UPLOAD_BYTES: 4 * 1024 * 1024 }));
vi.mock("@/adapters/server/api/products", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/adapters/server/api/products")>()),
  createProduct,
  updateProduct,
  uploadProductImage,
}));

import { createProductAction, updateProductAction, uploadProductImageAction } from "./actions";

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
  it("成立したら一覧へ送り、商品を読む取得を取り直させる", async () => {
    createProduct.mockResolvedValue({});

    await expect(createProductAction(idleActionState(), productForm())).rejects.toThrow(
      "NEXT_REDIRECT:/admin/products",
    );
    expect(updateTag).toHaveBeenCalledWith("products");
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

    // `expect(A && B).toBeDefined()` は A が偽でも `false` が defined なので通る。名指しで見る。
    expect(state).toMatchObject({
      status: "error",
      formError: null,
      fieldErrors: { name: ["商品名を入力してください。"] },
    });
    expect(createProduct).not.toHaveBeenCalled();
  });

  it("版が無ければ、編集の前提が失われたことを全体の誤りとして返す", async () => {
    // 項目の誤りではないので、項目へ相乗りさせずここまで届く必要がある。
    const state = await updateProductAction(idleActionState(), productForm({ version: "" }));

    expect(state).toMatchObject({
      status: "error",
      formError: "編集の前提が失われています。画面を開き直してください。",
    });
    expect(updateProduct).not.toHaveBeenCalled();
  });

  it("作れなかったことを分類済みの結果として返す", async () => {
    createProduct.mockRejectedValue(createAppError(ErrorKind.VALIDATION));

    const state = await createProductAction(idleActionState(), productForm());

    expect(state.status).toBe("error");
  });
});

describe("updateProductAction", () => {
  // ----- 正常系 -----
  it("成立したら一覧へ送り、商品を読む取得を取り直させる", async () => {
    updateProduct.mockResolvedValue({});

    await expect(updateProductAction(idleActionState(), productForm())).rejects.toThrow(
      "NEXT_REDIRECT:/admin/products",
    );
    expect(updateTag).toHaveBeenCalledWith("products");
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
