import { describe, expect, it } from "vitest";

import type { AdminProductListConditions, AdminProductListLocation } from "./query";
import { readDiscontinuedSpelling, toAdminProductListLocation } from "./read-location";

const NO_CONDITIONS: AdminProductListConditions = {
  keyword: "",
  categoryCodes: [],
  statusCodes: [],
  discontinued: null,
};

function location(overrides: Partial<AdminProductListLocation> = {}): AdminProductListLocation {
  return { ...NO_CONDITIONS, cursor: null, trail: [], ...overrides };
}

describe("readDiscontinuedSpelling", () => {
  // ----- 正常系 -----
  it("読める綴りをそのまま取り出す", () => {
    expect(readDiscontinuedSpelling({ discontinued: "true" })).toBe("true");
  });

  it("条件として読めない綴りも、未指定へ倒さずに取り出す", () => {
    expect(readDiscontinuedSpelling({ discontinued: "yes" })).toBe("yes");
  });

  it("前後の空白を落として取り出す", () => {
    expect(readDiscontinuedSpelling({ discontinued: " false " })).toBe("false");
  });

  it("載っていなければ null を返す", () => {
    expect(readDiscontinuedSpelling({})).toBeNull();
  });

  it("空の値は届いていないものとして null を返す", () => {
    expect(readDiscontinuedSpelling({ discontinued: "" })).toBeNull();
  });

  // ----- 異常系 -----
  it("重ねて載っていれば、どちらも採らずに null を返す", () => {
    expect(readDiscontinuedSpelling({ discontinued: ["true", "false"] })).toBeNull();
  });
});

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

  it("廃番のみの綴りを、廃番で絞り込む条件として読む", () => {
    expect(toAdminProductListLocation({ discontinued: "true" }).discontinued).toBe("true");
  });

  it("廃番を除く綴りを、廃番で絞り込む条件として読む", () => {
    expect(toAdminProductListLocation({ discontinued: "false" }).discontinued).toBe("false");
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

  it("廃番の条件として読めない綴りは、絞り込まない条件として読む", () => {
    expect(toAdminProductListLocation({ discontinued: "yes" }).discontinued).toBeNull();
  });

  it("起点が無いのに道だけ残った URL では道を捨てる", () => {
    expect(toAdminProductListLocation({ trail: ["c1"] })).toEqual(location());
  });

  it("空の道の要素を落とす", () => {
    expect(toAdminProductListLocation({ after: "c2", trail: ["", "c1"] }).trail).toEqual(["c1"]);
  });
});
