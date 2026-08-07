import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ShopLayout from "./layout";

describe("ShopLayout", () => {
  // ----- 正常系 -----
  it("利用者向けの外枠へ子要素を入れる", () => {
    const markup = renderToStaticMarkup(
      <ShopLayout>
        <p>テスト用コンテンツ</p>
      </ShopLayout>,
    );

    expect(markup).toContain("テスト用コンテンツ");
    expect(markup).toContain("<main");
  });

  it("商品への導線を持つ", () => {
    const markup = renderToStaticMarkup(
      <ShopLayout>
        <p>本文</p>
      </ShopLayout>,
    );

    expect(markup).toContain('href="/products"');
  });
});
