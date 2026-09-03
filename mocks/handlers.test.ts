import { describe, expect, it } from "vitest";

import { getGoBoilerplateAPIMock } from "./api/endpoints.msw";
import { handlers } from "./handlers";

/** ハンドラが指すパス。生成物は HTTP ハンドラだけなので、常に文字列で得られる。 */
function pathOf(handler: (typeof handlers)[number]): string {
  return String(handler.info.path);
}

describe("handlers", () => {
  // ----- 正常系 -----
  it("具体的なパスを、それに一致してしまうパラメータ区間より先に置く", () => {
    const indexOf = (suffix: string) =>
      handlers.findIndex((handler) => pathOf(handler).endsWith(suffix));

    // `/v1/products/:productId` は `/v1/products/ranking` にも一致するため、
    // 先に並ぶとランキングへの要求が商品 1 件のハンドラに食われる。
    expect(indexOf("/v1/products/ranking")).toBeLessThan(indexOf("/v1/products/:productId"));
    expect(indexOf("/v1/products/low-stock")).toBeLessThan(indexOf("/v1/products/:productId"));
    expect(indexOf("/v1/users/me")).toBeLessThan(indexOf("/v1/users/:userId"));
  });

  it("生成物が持つ口をすべて通し、落とさず増やさない", () => {
    // 呼ぶたび別インスタンスが返るので、突き合わせは口（method + path）で行う。
    const endpointOf = (handler: (typeof handlers)[number]) =>
      `${String(handler.info.method)} ${pathOf(handler)}`;
    const generated = getGoBoilerplateAPIMock().map(endpointOf).sort();

    expect(handlers.map(endpointOf).sort()).toEqual(generated);
  });
});
