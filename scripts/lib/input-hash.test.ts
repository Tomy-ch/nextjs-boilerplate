import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { collectInputs, decideGate, inputsHash } from "./input-hash";

let root: string;

/** リポジトリルートに見立てた木へファイルを置く。 */
function place(relative: string, content = ""): void {
  const file = join(root, relative);
  mkdirSync(join(file, ".."), { recursive: true });
  writeFileSync(file, content);
}

const everything = (): boolean => true;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "input-hash-"));
});

afterEach(() => {
  rmSync(root, { force: true, recursive: true });
});

describe("collectInputs", () => {
  // ----- 正常系 -----
  it("ディレクトリを再帰して辿り、ファイルだけを並べて返す", () => {
    place("dir/a.ts");
    place("dir/nested/b.ts");
    place("single.yaml");

    expect(collectInputs(root, ["dir", "single.yaml"], everything)).toEqual([
      "dir/a.ts",
      "dir/nested/b.ts",
      "single.yaml",
    ]);
  });

  it("並びは起点を渡した順に依らない", () => {
    place("dir/a.ts");
    place("single.yaml");

    expect(collectInputs(root, ["single.yaml", "dir"], everything)).toEqual(
      collectInputs(root, ["dir", "single.yaml"], everything),
    );
  });

  it("述語が false を返したものは並ばない", () => {
    place("dir/a.ts");
    place("dir/a.test.ts");

    expect(collectInputs(root, ["dir"], (relative) => !relative.endsWith(".test.ts"))).toEqual([
      "dir/a.ts",
    ]);
  });

  // ----- 異常系 -----
  it("起点が 1 つでも無ければ例外を投げる", () => {
    place("dir/a.ts");

    expect(() => collectInputs(root, ["dir", "missing.yaml"], everything)).toThrow();
  });
});

describe("inputsHash", () => {
  // ----- 正常系 -----
  it("中身が同じなら同じ値になる", () => {
    place("a.ts", "same");

    expect(inputsHash(root, ["a.ts"])).toBe(inputsHash(root, ["a.ts"]));
  });

  it("中身が変わると値が変わる", () => {
    place("a.ts", "before");
    const before = inputsHash(root, ["a.ts"]);
    place("a.ts", "after");

    expect(inputsHash(root, ["a.ts"])).not.toBe(before);
  });

  it("中身が同じでも置き場所が変われば値が変わる", () => {
    place("a.ts", "same");
    place("b.ts", "same");

    expect(inputsHash(root, ["a.ts"])).not.toBe(inputsHash(root, ["b.ts"]));
  });
});

describe("decideGate", () => {
  // ----- 正常系 -----
  it("記録のどれか 1 つが一致すれば省く", () => {
    expect(decideGate(["別の値", "いまの値"], "いまの値")).toBe("skip");
  });

  it("記録の前後の空白は無視する", () => {
    expect(decideGate(["いまの値\n"], "いまの値")).toBe("skip");
  });

  it("どれとも一致しなければ走らせる", () => {
    expect(decideGate(["別の値"], "いまの値")).toBe("run");
  });

  // ----- 異常系 -----
  it("記録が 1 つも無ければ走らせる", () => {
    expect(decideGate([null, null], "いまの値")).toBe("run");
  });

  it("記録の一覧が空でも走らせる", () => {
    expect(decideGate([], "いまの値")).toBe("run");
  });
});
