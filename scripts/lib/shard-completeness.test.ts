import { describe, expect, it } from "vitest";

import { expectedShardTotal } from "./shard-completeness";

/** 「blob-<台目>-<台数>.json」を読む手立て。台の書いた結果でなければ undefined を返す。 */
function readBlobTotal(fileName: string): number | undefined {
  const matched = /^blob-([1-9]\d*)-([1-9]\d*)\.json$/.exec(fileName);

  return matched === null ? undefined : Number(matched[2]);
}

describe("expectedShardTotal", () => {
  // ----- 正常系 -----
  it("全台ぶん揃っていれば台数を返す", () => {
    expect(
      expectedShardTotal(["blob-1-3.json", "blob-2-3.json", "blob-3-3.json"], readBlobTotal),
    ).toBe(3);
  });

  it("結果ではないファイルが混ざっていても数に入れない", () => {
    expect(expectedShardTotal(["blob-1-1.json", "coverage-final.json"], readBlobTotal)).toBe(1);
  });

  // ----- 異常系 -----
  it("1 台も届いていなければ断る", () => {
    expect(() => expectedShardTotal(["coverage-final.json"], readBlobTotal)).toThrow(
      "分割の結果が 1 台ぶんも届いていません",
    );
  });

  it("別々の台数で割られていれば、その台数を小さい順に挙げて断る", () => {
    expect(() => expectedShardTotal(["blob-1-3.json", "blob-1-2.json"], readBlobTotal)).toThrow(
      "届いた結果が別々の台数で割られています: 2, 3",
    );
  });

  it("足りない台があれば、届いた数を挙げて断る", () => {
    expect(() => expectedShardTotal(["blob-1-4.json", "blob-2-4.json"], readBlobTotal)).toThrow(
      "分割 4 台のうち 2 台ぶんしか結果が届いていません",
    );
  });
});
