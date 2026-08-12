import { describe, expect, it } from "vitest";

import {
  buildDanglingCommand,
  collectFailures,
  DANGLING_PATTERN,
  findDanglingReferences,
  findLeftoverMakeTarget,
  findUnregisteredDeletions,
  findUnremovedPaths,
  parseDeletedPaths,
  parseSnapshot,
  selfDestructTargets,
} from "./verify";

const NOTHING_EXISTS = () => false;

describe("buildDanglingCommand", () => {
  // ----- 正常系 -----
  it("検出条件を含む grep を組む", () => {
    expect(buildDanglingCommand()).toContain(DANGLING_PATTERN);
  });

  it("ヒットが無くても落ちないようにする", () => {
    expect(buildDanglingCommand()).toContain("|| true");
  });
});

describe("parseSnapshot", () => {
  // ----- 正常系 -----
  it("登録パスを取り出す", () => {
    expect(parseSnapshot('{"registeredPaths":["src/features/products"]}')).toEqual([
      "src/features/products",
    ]);
  });

  // ----- 異常系 -----
  it("登録パスが空なら落とす", () => {
    expect(() => parseSnapshot('{"registeredPaths":[]}')).toThrow("registeredPaths が空です");
  });

  it("登録パスが配列でなければ落とす", () => {
    expect(() => parseSnapshot('{"registeredPaths":"src"}')).toThrow("registeredPaths が空です");
  });

  it("JSON として読めなければ落とす", () => {
    expect(() => parseSnapshot("not json")).toThrow();
  });
});

describe("parseDeletedPaths", () => {
  // ----- 正常系 -----
  it("削除エントリの相対パスを取り出す", () => {
    expect(parseDeletedPaths(" D src/a.ts\nD  src/b.ts\n M src/c.ts")).toEqual([
      "src/a.ts",
      "src/b.ts",
    ]);
  });

  it("削除が無ければ空を返す", () => {
    expect(parseDeletedPaths(" M src/c.ts")).toEqual([]);
  });
});

describe("findUnremovedPaths", () => {
  // ----- 正常系 -----
  it("消えていない登録パスを報告する", () => {
    expect(findUnremovedPaths(["src/a"], (p) => p === "src/a")).toEqual([
      "未削除の登録パス: src/a",
    ]);
  });

  it("すべて消えていれば何も報告しない", () => {
    expect(findUnremovedPaths(["src/a"], NOTHING_EXISTS)).toEqual([]);
  });
});

describe("findUnregisteredDeletions", () => {
  // ----- 正常系 -----
  it("登録パスの配下の削除は想定内として扱う", () => {
    expect(findUnregisteredDeletions(["src/a"], ["src/a/b.ts"])).toEqual([]);
  });

  it("登録パスと同一の削除も想定内として扱う", () => {
    expect(findUnregisteredDeletions(["src/a.ts"], ["src/a.ts"])).toEqual([]);
  });

  // ----- 異常系 -----
  it("登録外の削除を報告する", () => {
    expect(findUnregisteredDeletions(["src/a"], ["src/other.ts"])).toEqual([
      "登録外の削除を検出: src/other.ts",
    ]);
  });
});

describe("findLeftoverMakeTarget", () => {
  // ----- 正常系 -----
  it("ターゲットが消えていれば何も報告しない", () => {
    expect(findLeftoverMakeTarget("setup-repo  リポジトリの初期化")).toEqual([]);
  });

  // ----- 異常系 -----
  it("ターゲットが残っていれば報告する", () => {
    expect(findLeftoverMakeTarget("setup-remove-sample  破棄")).toEqual([
      "make ターゲット setup-remove-sample が残っています",
    ]);
  });
});

describe("findDanglingReferences", () => {
  // ----- 正常系 -----
  it("ヒットが無ければ何も報告しない", () => {
    expect(findDanglingReferences("  \n ")).toEqual([]);
  });

  // ----- 異常系 -----
  it("ヒットをそのまま添えて報告する", () => {
    expect(findDanglingReferences("src/x.ts:1:商品")).toEqual([
      "残留サンプル参照:\nsrc/x.ts:1:商品",
    ]);
  });
});

describe("collectFailures", () => {
  // ----- 正常系 -----
  it("過不足も残留も無ければ空を返す", () => {
    expect(
      collectFailures({
        registeredPaths: ["src/a"],
        pathExists: NOTHING_EXISTS,
        gitStatusPorcelain: " D src/a/b.ts",
        makeHelpOutput: "setup-repo",
        danglingHits: "",
      }),
    ).toEqual([]);
  });

  // ----- 異常系 -----
  it("4 種の失敗をまとめて返す", () => {
    const failures = collectFailures({
      registeredPaths: ["src/a"],
      pathExists: () => true,
      gitStatusPorcelain: " D src/other.ts",
      makeHelpOutput: "setup-remove-sample",
      danglingHits: "src/x.ts:1:商品",
    });

    expect(failures).toHaveLength(4);
  });
});

describe("selfDestructTargets", () => {
  // ----- 正常系 -----
  it("スナップショットと自身のディレクトリを返す", () => {
    expect(selfDestructTargets("/repo/scripts/setup/verify", "/repo/tmp/s.json")).toEqual([
      "/repo/tmp/s.json",
      "/repo/scripts/setup/verify",
    ]);
  });
});
