import { describe, expect, it } from "vitest";

import { toProductId } from "@/model/product/product";

import { toProductStructuredData } from "./structured-data";

const PRODUCT = {
  id: toProductId("0195f0c2-0000-7000-8000-000000000001"),
  name: "深煎りブレンド",
  description: "<p>説明</p>",
  price: "12.34",
  quantity: 7,
  stockWarningThreshold: null,
  status: { id: "s1", name: "公開中" },
  category: { id: "c1", name: "コーヒー" },
  publishedAt: null,
  discontinuedAt: null,
  imagePaths: ["coffee.png"],
  version: 1,
};

describe("toProductStructuredData", () => {
  // ----- 正常系 -----
  it("schema.org の Product として名前・分類・価格を写す", () => {
    const data = toProductStructuredData(PRODUCT, ["https://media.test/coffee.png"]);

    expect(data).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Product",
      name: "深煎りブレンド",
      sku: PRODUCT.id,
      category: "コーヒー",
      image: ["https://media.test/coffee.png"],
      offers: { "@type": "Offer", price: "12.34", priceCurrency: "USD" },
    });
  });

  it("在庫があれば InStock を名乗る", () => {
    expect(toProductStructuredData(PRODUCT, [])).toMatchObject({
      offers: { availability: "https://schema.org/InStock" },
    });
  });

  it("在庫が無ければ OutOfStock を名乗る", () => {
    expect(toProductStructuredData({ ...PRODUCT, quantity: 0 }, [])).toMatchObject({
      offers: { availability: "https://schema.org/OutOfStock" },
    });
  });

  it("画像が無ければ image を置かない", () => {
    expect(toProductStructuredData(PRODUCT, [])).not.toHaveProperty("image");
  });

  it("markup を持つ説明は載せない", () => {
    expect(toProductStructuredData(PRODUCT, [])).not.toHaveProperty("description");
  });
});
