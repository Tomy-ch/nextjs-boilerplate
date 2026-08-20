import { describe, expect, it } from "vitest";

import { parseProductDraftForm, parseProductEditForm } from "./parse-product-form";

/** 形の上で通る最小の入力。個々のケースは、ここから 1 項目だけ崩す。 */
function validForm(overrides: Readonly<Record<string, string>> = {}): FormData {
  const form = new FormData();
  const values: Record<string, string> = {
    name: "ワイヤレスイヤホン",
    price: "19.99",
    quantity: "3",
    stockWarningThreshold: "2",
    categoryId: "01936f6d-0000-7000-8000-000000000001",
    statusId: "01936f6d-0000-7000-8000-000000000101",
    publishedAt: "2026-08-07T09:00",
    description: "<p>説明</p>",
    version: "4",
    ...overrides,
  };

  for (const [key, value] of Object.entries(values)) {
    if (value !== "") form.append(key, value);
  }

  return form;
}

describe("parseProductDraftForm", () => {
  // ----- 正常系 -----
  it("形の上で通る入力を、作る商品の内容へ写す", () => {
    const result = parseProductDraftForm(validForm());

    expect(result.ok).toBe(true);
    expect(result.ok && result.value).toMatchObject({
      name: "ワイヤレスイヤホン",
      price: "19.99",
      quantity: 3,
      stockWarningThreshold: 2,
    });
  });

  it("価格を文字列のまま運ぶ。数にすると精度が落ちるため", () => {
    const result = parseProductDraftForm(validForm({ price: "19.995" }));

    expect(result.ok && result.value.price).toBe("19.995");
  });

  it("空欄の閾値を、閾値を持たないこととして写す", () => {
    const result = parseProductDraftForm(validForm({ stockWarningThreshold: "" }));

    expect(result.ok && result.value.stockWarningThreshold).toBeNull();
  });

  it("空欄の説明を、説明を持たないこととして写す", () => {
    const result = parseProductDraftForm(validForm({ description: "" }));

    expect(result.ok && result.value.description).toBeNull();
  });

  it("空欄の公開日時を、未公開として写す", () => {
    const result = parseProductDraftForm(validForm({ publishedAt: "" }));

    expect(result.ok && result.value.publishedAt).toBeNull();
  });

  it("画像は送られた並びの順に、1 から数えた表示順を振る", () => {
    const form = validForm();
    form.append("images", "products/00000000-0000-4000-8000-000000000001.png");
    form.append("images", "products/00000000-0000-4000-8000-000000000002.png");

    const result = parseProductDraftForm(form);

    expect(result.ok && result.value.images).toEqual([
      { imagePath: "products/00000000-0000-4000-8000-000000000001.png", displaySort: 1 },
      { imagePath: "products/00000000-0000-4000-8000-000000000002.png", displaySort: 2 },
    ]);
  });

  it("画像が無ければ空のまま送る", () => {
    const result = parseProductDraftForm(validForm());

    expect(result.ok && result.value.images).toEqual([]);
  });

  // ----- 異常系 -----
  it("空欄の必須項目を、項目ごとの誤りとして返す", () => {
    const result = parseProductDraftForm(validForm({ name: "" }));

    expect(result.ok).toBe(false);
    expect(!result.ok && result.fieldErrors.name).toEqual(["商品名を入力してください。"]);
  });

  it("在庫数が欠けていれば断る。作るときだけ尋ねる項目のため", () => {
    const result = parseProductDraftForm(validForm({ quantity: "" }));

    expect(!result.ok && result.fieldErrors.quantity).toEqual(["在庫数を入力してください。"]);
  });

  it("誤りが複数あれば、すべてを返す", () => {
    const result = parseProductDraftForm(validForm({ name: "", price: "" }));

    expect(!result.ok && Object.keys(result.fieldErrors)).toEqual(["name", "price"]);
  });

  it("1 つでも誤っていれば内容を返さない", () => {
    const result = parseProductDraftForm(validForm({ price: "abc" }));

    expect(result.ok).toBe(false);
  });
});

describe("parseProductEditForm", () => {
  // ----- 正常系 -----
  it("形の上で通る入力を、送る変更の内容へ写す", () => {
    const result = parseProductEditForm(validForm());

    expect(result.ok && result.value).toMatchObject({ name: "ワイヤレスイヤホン", version: 4 });
  });

  it("在庫数を送らない。在庫は別の口が持つため", () => {
    const result = parseProductEditForm(validForm());

    expect(result.ok && result.value).not.toHaveProperty("quantity");
  });

  it("在庫数が空欄でも通る", () => {
    expect(parseProductEditForm(validForm({ quantity: "" })).ok).toBe(true);
  });

  // ----- 異常系 -----
  it("版が無ければ、編集の前提が失われたものとして断る", () => {
    const result = parseProductEditForm(validForm({ version: "" }));

    expect(result.ok).toBe(false);
    expect(!result.ok && result.fieldErrors.name?.at(-1)).toBe(
      "編集の前提が失われています。画面を開き直してください。",
    );
  });

  it("版が数として読めなければ断る", () => {
    expect(parseProductEditForm(validForm({ version: "いくつか" })).ok).toBe(false);
  });

  it("版が欠けていても、項目の誤りは併せて返す", () => {
    const result = parseProductEditForm(validForm({ version: "", name: "" }));

    expect(!result.ok && result.fieldErrors.name).toEqual([
      "商品名を入力してください。",
      "編集の前提が失われています。画面を開き直してください。",
    ]);
  });
});
