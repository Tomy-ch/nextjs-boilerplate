import { describe, expect, it } from "vitest";

import {
  type AdminProductListConditions,
  type AdminProductListLocation,
  DISCONTINUED_FILTER,
  toConditionHref,
  toNextPageHref,
  toPreviousPageHref,
} from "./query";

const NO_CONDITIONS: AdminProductListConditions = {
  keyword: "",
  categoryCodes: [],
  statusCodes: [],
  discontinued: null,
};

function location(overrides: Partial<AdminProductListLocation> = {}): AdminProductListLocation {
  return { ...NO_CONDITIONS, cursor: null, trail: [], ...overrides };
}

describe("toConditionHref", () => {
  // ----- 正常系 -----
  it("条件が無ければ一覧のパスだけを返す", () => {
    expect(toConditionHref(NO_CONDITIONS)).toBe("/admin/products");
  });

  it("効いている条件だけを載せる", () => {
    expect(toConditionHref({ ...NO_CONDITIONS, keyword: "鞄", statusCodes: ["2"] })).toBe(
      "/admin/products?keyword=%E9%9E%84&statusCodes=2",
    );
  });

  it("読み進めた位置を引き継がない", () => {
    expect(toConditionHref({ ...NO_CONDITIONS, categoryCodes: ["1"] })).not.toContain("after=");
  });

  it("廃番のみで絞り込んでいれば、契約の真偽値の綴りで載せる", () => {
    expect(toConditionHref({ ...NO_CONDITIONS, discontinued: DISCONTINUED_FILTER.ONLY })).toBe(
      "/admin/products?discontinued=true",
    );
  });

  it("廃番を除いて絞り込んでいれば、偽の綴りで載せる", () => {
    expect(toConditionHref({ ...NO_CONDITIONS, discontinued: DISCONTINUED_FILTER.EXCLUDED })).toBe(
      "/admin/products?discontinued=false",
    );
  });

  it("廃番で絞り込んでいなければ、そのキーを載せない", () => {
    expect(toConditionHref({ ...NO_CONDITIONS, keyword: "鞄" })).not.toContain("discontinued");
  });

  it("廃番の条件を、他の絞り込みの後ろに並べる", () => {
    expect(
      toConditionHref({
        ...NO_CONDITIONS,
        statusCodes: ["2"],
        discontinued: DISCONTINUED_FILTER.ONLY,
      }),
    ).toBe("/admin/products?statusCodes=2&discontinued=true");
  });
});

describe("toNextPageHref", () => {
  // ----- 正常系 -----
  it("先頭ページからは道を持たずに次の起点だけを載せる", () => {
    expect(toNextPageHref(location(), "c1")).toBe("/admin/products?after=c1");
  });

  it("いまの起点を道の末尾へ足す", () => {
    expect(toNextPageHref(location({ cursor: "c1" }), "c2")).toBe(
      "/admin/products?after=c2&trail=c1",
    );
  });

  it("道を積み上げる", () => {
    expect(toNextPageHref(location({ cursor: "c2", trail: ["c1"] }), "c3")).toBe(
      "/admin/products?after=c3&trail=c1&trail=c2",
    );
  });

  it("効いている条件を引き継ぐ", () => {
    expect(toNextPageHref(location({ categoryCodes: ["1"] }), "c1")).toBe(
      "/admin/products?categoryCodes=1&after=c1",
    );
  });

  it("廃番の条件も起点より前に引き継ぐ", () => {
    expect(toNextPageHref(location({ discontinued: DISCONTINUED_FILTER.EXCLUDED }), "c1")).toBe(
      "/admin/products?discontinued=false&after=c1",
    );
  });
});

describe("toPreviousPageHref", () => {
  // ----- 正常系 -----
  it("道の末尾を起点へ戻す", () => {
    expect(toPreviousPageHref(location({ cursor: "c3", trail: ["c1", "c2"] }))).toBe(
      "/admin/products?after=c2&trail=c1",
    );
  });

  it("道が空なら起点そのものを落とす", () => {
    expect(toPreviousPageHref(location({ cursor: "c1" }))).toBe("/admin/products");
  });

  it("効いている条件を引き継ぐ", () => {
    expect(toPreviousPageHref(location({ keyword: "鞄", cursor: "c1" }))).toBe(
      "/admin/products?keyword=%E9%9E%84",
    );
  });

  // ----- 異常系 -----
  it("先頭ページには行き先を返さない", () => {
    expect(toPreviousPageHref(location())).toBeUndefined();
  });
});
