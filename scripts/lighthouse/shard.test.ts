import { describe, expect, it } from "vitest";

import { expectedTotal, parseShard, selectShard, shardFileName } from "./shard";

describe("parseShard", () => {
  // ----- 正常系 -----
  it("台目と台数を読む", () => {
    expect(parseShard("2/4")).toEqual({ index: 2, total: 4 });
  });

  it("前後の空白を落としてから読む", () => {
    expect(parseShard("  3/4  ")).toEqual({ index: 3, total: 4 });
  });

  it("割らない指定も読む", () => {
    expect(parseShard("1/1")).toEqual({ index: 1, total: 1 });
  });

  // ----- 異常系 -----
  it("形になっていない指定を、綴りごと挙げて断る", () => {
    expect(() => parseShard("2of4")).toThrow("2of4");
  });

  it("0 台目を断る", () => {
    expect(() => parseShard("0/4")).toThrow("読めません");
  });

  it("台数を超える台目を、台数を挙げて断る", () => {
    expect(() => parseShard("5/4")).toThrow("4 台に 5 台目はありません");
  });
});

describe("selectShard", () => {
  const items = ["a", "b", "c", "d", "e", "f", "g"];

  // ----- 正常系 -----
  it("1 つ飛ばしで配り、重い対象が同じ台へ固まらないようにする", () => {
    expect(selectShard(items, { index: 1, total: 3 })).toEqual(["a", "d", "g"]);
    expect(selectShard(items, { index: 2, total: 3 })).toEqual(["b", "e"]);
    expect(selectShard(items, { index: 3, total: 3 })).toEqual(["c", "f"]);
  });

  it("全台を合わせると元の集合に戻る", () => {
    const gathered = [1, 2, 3, 4].flatMap((index) => selectShard(items, { index, total: 4 }));

    expect([...gathered].sort()).toEqual([...items].sort());
  });

  it("割らない指定では全件を返す", () => {
    expect(selectShard(items, { index: 1, total: 1 })).toEqual(items);
  });

  it("対象より台数が多ければ、余った台は空になる", () => {
    expect(selectShard(["a"], { index: 2, total: 3 })).toEqual([]);
  });
});

describe("shardFileName", () => {
  // ----- 正常系 -----
  it("台目と台数を綴りに持たせる", () => {
    expect(shardFileName({ index: 2, total: 4 })).toBe("measurements-2-4.json");
  });
});

describe("expectedTotal", () => {
  // ----- 正常系 -----
  it("全台ぶん揃っていれば台数を返す", () => {
    expect(
      expectedTotal(["measurements-1-3.json", "measurements-2-3.json", "measurements-3-3.json"]),
    ).toBe(3);
  });

  it("結果ではないファイルが混ざっていても数に入れない", () => {
    expect(expectedTotal(["measurements-1-1.json", "headers-admin.json", "top-1.json"])).toBe(1);
  });

  // ----- 異常系 -----
  it("1 台も届いていなければ断る", () => {
    expect(() => expectedTotal(["headers-admin.json"])).toThrow("1 台ぶんも届いていません");
  });

  it("別々の台数で割られていれば、その台数を挙げて断る", () => {
    expect(() => expectedTotal(["measurements-1-2.json", "measurements-1-3.json"])).toThrow("2, 3");
  });

  it("足りない台があれば、届いた数を挙げて断る", () => {
    expect(() => expectedTotal(["measurements-1-4.json", "measurements-2-4.json"])).toThrow(
      "分割 4 台のうち 2 台ぶんしか結果が届いていません",
    );
  });
});
