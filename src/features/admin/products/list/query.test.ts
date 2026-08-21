import { describe, expect, it } from "vitest";

import {
  type AdminProductListLocation,
  toAdminProductListLocation,
  toConditionHref,
  toNextPageHref,
  toPreviousPageHref,
} from "./query";

const NO_CONDITIONS = { keyword: "", categoryCodes: [], statusCodes: [] };

function location(overrides: Partial<AdminProductListLocation> = {}): AdminProductListLocation {
  return { ...NO_CONDITIONS, cursor: null, trail: [], ...overrides };
}

describe("toAdminProductListLocation", () => {
  // ----- 正常系 -----
  it("何も載っていない URL を先頭ページとして読む", () => {
    expect(toAdminProductListLocation({})).toEqual(location());
  });

  it("通ってきた道は、同じ起点が並んでいてもそのままの段数で読む", () => {
    expect(toAdminProductListLocation({ after: "c3", trail: ["c1", "c1", "c2"] }).trail).toEqual([
      "c1",
      "c1",
      "c2",
    ]);
  });

  it("絞り込みと起点を読む", () => {
    expect(
      toAdminProductListLocation({
        keyword: "イヤホン",
        categoryCodes: "1",
        statusCodes: "2",
        after: "c1",
      }),
    ).toEqual(
      location({ keyword: "イヤホン", categoryCodes: ["1"], statusCodes: ["2"], cursor: "c1" }),
    );
  });

  it("通ってきた道を並びとして読む", () => {
    expect(toAdminProductListLocation({ after: "c3", trail: ["c1", "c2"] }).trail).toEqual([
      "c1",
      "c2",
    ]);
  });

  it("前後の空白を落とす", () => {
    expect(toAdminProductListLocation({ keyword: "  イヤホン  " }).keyword).toBe("イヤホン");
  });

  it("空文字の条件は指定なしとして読む", () => {
    expect(toAdminProductListLocation({ keyword: "" }).keyword).toBe("");
  });

  // ----- 異常系 -----
  it("1 つしか受け取らない条件が重ねて載っていれば、語も起点も未指定として読む", () => {
    expect(
      toAdminProductListLocation({ keyword: ["イヤホン", "スピーカー"], after: ["c1", "c2"] }),
    ).toEqual(location());
  });

  it("同じ値が繰り返された条件は畳む", () => {
    expect(toAdminProductListLocation({ categoryCodes: ["1", "2", "1"] }).categoryCodes).toEqual([
      "1",
      "2",
    ]);
  });

  it("起点が無いのに道だけ残った URL では道を捨てる", () => {
    expect(toAdminProductListLocation({ trail: ["c1"] })).toEqual(location());
  });

  it("空の道の要素を落とす", () => {
    expect(toAdminProductListLocation({ after: "c2", trail: ["", "c1"] }).trail).toEqual(["c1"]);
  });
});

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
