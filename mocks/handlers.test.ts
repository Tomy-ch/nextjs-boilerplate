import { describe, expect, it } from "vitest";

import { getGoBoilerplateAPIMock } from "./api/endpoints.msw";
import { handlers } from "./handlers";

/** ハンドラが指すパス。生成物は HTTP ハンドラだけなので、常に文字列で得られる。 */
function pathOf(handler: (typeof handlers)[number]): string {
  return String(handler.info.path);
}

/**
 * その口が並びの何番目に居るか。
 *
 * @remarks
 * 見つからなければ落とします。`findIndex` の `-1` をそのまま比較に使うと、綴りを間違えた口が
 * 常に「先に居る」ことになり、並び順を 1 つも検査しないまま通ります。
 */
function indexOf(suffix: string): number {
  const index = handlers.findIndex((handler) => pathOf(handler).endsWith(suffix));

  expect(index, `${suffix} で終わる口が生成物にありません`).toBeGreaterThanOrEqual(0);

  return index;
}

describe("handlers", () => {
  // ----- 正常系 -----
  it("パラメータ区間の少ない口から順に並べる", () => {
    const counts = handlers.map((handler) => (pathOf(handler).match(/:/g) ?? []).length);

    expect(counts).toEqual([...counts].sort((left, right) => left - right));
  });

  it("具体的なパスを、それに一致してしまうパラメータ区間より先に置く", () => {
    // `/v1/products/:productId` は `/v1/products/ranking/amount` にも一致するため、
    // 先に並ぶとランキングへの要求が商品 1 件のハンドラに食われる。
    expect(indexOf("/v1/products/ranking/amount")).toBeLessThan(
      indexOf("/v1/products/:productId"),
    );
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
