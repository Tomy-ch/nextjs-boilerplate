import { describe, expect, it } from "vitest";

import { pinKey, readPin } from "./lock";
import { RULES_REPO } from "./manifest";

const COMMIT = "f1d2b562b414783763fd02a6ed2736eaed622efa";
const DIGEST = "0dfbc521a0604b5388dd3988e5e55287833597c93e71d7425a805e0379e5973c";

describe("pinKey", () => {
  // ----- 正常系 -----
  it("供給元と commit を繋いだキーにする", () => {
    expect(pinKey(COMMIT)).toBe(`${RULES_REPO}@${COMMIT}`);
  });
});

describe("readPin", () => {
  // ----- 正常系 -----
  it("キーから commit を、値から digest を取り出す", () => {
    const lock = new Map([[pinKey(COMMIT), DIGEST]]);

    expect(readPin(lock)).toEqual({ commit: COMMIT, digest: DIGEST });
  });

  // ----- 異常系 -----
  it("固定が 1 件も無ければ落とす", () => {
    expect(() => readPin(new Map())).toThrow(/固定は 1 件でなければなりません（0 件あります）/);
  });

  it("固定が 2 件以上あれば落とす", () => {
    const lock = new Map([
      [pinKey(COMMIT), DIGEST],
      [pinKey(COMMIT.replace(/^f/, "a")), DIGEST],
    ]);

    expect(() => readPin(lock)).toThrow(/固定は 1 件でなければなりません（2 件あります）/);
  });

  it("供給元が違うキーを読まない", () => {
    const lock = new Map([[`other/rules@${COMMIT}`, DIGEST]]);

    expect(() => readPin(lock)).toThrow(/キーが読めません/);
  });

  it("commit の形になっていないキーを読まない", () => {
    const lock = new Map([[`${RULES_REPO}@main`, DIGEST]]);

    expect(() => readPin(lock)).toThrow(/キーが読めません/);
  });
});
