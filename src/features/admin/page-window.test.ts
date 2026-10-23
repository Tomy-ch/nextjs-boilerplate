import { describe, expect, it } from "vitest";

import { toPageLinks, toPageWindow } from "./page-window";

describe("toPageWindow", () => {
  // ----- 正常系 -----
  it("全ページが窓に収まるなら、省略せず並べる", () => {
    expect(toPageWindow(1, 3)).toEqual([
      { kind: "page", page: 1 },
      { kind: "page", page: 2 },
      { kind: "page", page: 3 },
    ]);
  });

  it("1 ページしかなければ、その 1 つだけを出す", () => {
    expect(toPageWindow(1, 1)).toEqual([{ kind: "page", page: 1 }]);
  });

  it("先頭に居るときは、末尾との間だけを省略する", () => {
    expect(toPageWindow(1, 12)).toEqual([
      { kind: "page", page: 1 },
      { kind: "page", page: 2 },
      { kind: "gap", after: 2 },
      { kind: "page", page: 12 },
    ]);
  });

  it("中ほどに居るときは、両側を省略して現在の両隣を残す", () => {
    expect(toPageWindow(6, 12)).toEqual([
      { kind: "page", page: 1 },
      { kind: "gap", after: 1 },
      { kind: "page", page: 5 },
      { kind: "page", page: 6 },
      { kind: "page", page: 7 },
      { kind: "gap", after: 7 },
      { kind: "page", page: 12 },
    ]);
  });

  it("末尾に居るときは、先頭との間だけを省略する", () => {
    expect(toPageWindow(12, 12)).toEqual([
      { kind: "page", page: 1 },
      { kind: "gap", after: 1 },
      { kind: "page", page: 11 },
      { kind: "page", page: 12 },
    ]);
  });

  it("飛ばす対象が 1 ページだけなら、省略の印ではなくその番号を出す", () => {
    expect(toPageWindow(4, 6)).toEqual([
      { kind: "page", page: 1 },
      { kind: "page", page: 2 },
      { kind: "page", page: 3 },
      { kind: "page", page: 4 },
      { kind: "page", page: 5 },
      { kind: "page", page: 6 },
    ]);
  });

  it("省略の印は、飛ばした手前の番号で区別できる", () => {
    const gaps = toPageWindow(6, 12).filter((entry) => entry.kind === "gap");

    expect(gaps.map((gap) => gap.after)).toEqual([1, 7]);
  });
});

describe("toPageLinks", () => {
  // ----- 正常系 -----
  const hrefOf = (page: number) => `/admin/list?scope=withdrawn&page=${page}`;

  it("並べる番号ごとに、渡された組み方で行き先を作る", () => {
    expect(toPageLinks(1, 3, hrefOf).entries).toEqual([
      { kind: "page", page: 1, href: "/admin/list?scope=withdrawn&page=1", current: true },
      { kind: "page", page: 2, href: "/admin/list?scope=withdrawn&page=2", current: false },
      { kind: "page", page: 3, href: "/admin/list?scope=withdrawn&page=3", current: false },
    ]);
  });

  it("省略の印には行き先を持たせない", () => {
    const gaps = toPageLinks(6, 12, hrefOf).entries.filter((entry) => entry.kind === "gap");

    expect(gaps).toEqual([
      { kind: "gap", after: 1 },
      { kind: "gap", after: 7 },
    ]);
  });

  it("途中では、前後の行き先を隣のページへ向ける", () => {
    const links = toPageLinks(2, 4, hrefOf);

    expect(links.previousHref).toBe("/admin/list?scope=withdrawn&page=1");
    expect(links.nextHref).toBe("/admin/list?scope=withdrawn&page=3");
  });

  it("先頭では前の行き先を持たない", () => {
    expect(toPageLinks(1, 4, hrefOf)).not.toHaveProperty("previousHref");
  });

  it("末尾では次の行き先を持たない", () => {
    expect(toPageLinks(4, 4, hrefOf)).not.toHaveProperty("nextHref");
  });
});
