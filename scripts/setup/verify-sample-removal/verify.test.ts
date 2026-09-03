import { describe, expect, it } from "vitest";

import {
  buildDanglingCommand,
  collectFailures,
  findDanglingReferences,
  findLeftoverMakeTarget,
  findMissingRestorations,
  findUnregisteredDeletions,
  findUnremovedPaths,
  parseDeletedPaths,
  parseSnapshot,
  selfDestructTargets,
} from "./verify";

const NOTHING_EXISTS = () => false;

describe("buildDanglingCommand", () => {
  // ----- 正常系 -----
  it("渡された語彙を検出条件に使う", () => {
    expect(buildDanglingCommand("商品|カート")).toContain("商品|カート");
  });

  it("ヒットが無くても落ちないようにする", () => {
    expect(buildDanglingCommand("商品")).toContain("|| true");
  });
});

describe("parseSnapshot", () => {
  // ----- 正常系 -----
  it("登録パスと語彙を取り出す", () => {
    expect(
      parseSnapshot(
        '{"registeredPaths":["src/features/products"],"restoredPaths":["src/app/page.tsx"],"danglingPattern":"商品"}',
      ),
    ).toEqual({
      registeredPaths: ["src/features/products"],
      restoredPaths: ["src/app/page.tsx"],
      danglingPattern: "商品",
    });
  });

  // ----- 異常系 -----
  it("登録パスが空なら落とす", () => {
    expect(() =>
      parseSnapshot('{"registeredPaths":[],"restoredPaths":[],"danglingPattern":"商品"}'),
    ).toThrow("registeredPaths が空です");
  });

  it("登録パスが配列でなければ落とす", () => {
    expect(() =>
      parseSnapshot('{"registeredPaths":"src","restoredPaths":[],"danglingPattern":"商品"}'),
    ).toThrow("registeredPaths が空です");
  });

  it("語彙が空なら落とす", () => {
    expect(() =>
      parseSnapshot('{"registeredPaths":["src"],"restoredPaths":[],"danglingPattern":""}'),
    ).toThrow("danglingPattern が空です");
  });

  it("語彙が文字列でなければ落とす", () => {
    expect(() =>
      parseSnapshot('{"registeredPaths":["src"],"restoredPaths":[],"danglingPattern":1}'),
    ).toThrow("danglingPattern が空です");
  });

  it("JSON として読めなければ落とす", () => {
    expect(() => parseSnapshot("not json")).toThrow();
  });

  it("restoredPaths は空でも通す", () => {
    // 置き直しが 0 件でも破棄そのものは成立するので、registeredPaths と扱いが非対称である。
    expect(
      parseSnapshot('{"registeredPaths":["src"],"restoredPaths":[],"danglingPattern":"商品"}')
        .restoredPaths,
    ).toEqual([]);
  });

  it("restoredPaths が配列でなければ断る", () => {
    expect(() => parseSnapshot('{"registeredPaths":["src"],"danglingPattern":"商品"}')).toThrow(
      "restoredPaths がありません",
    );
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

  it("登録パスと接頭辞だけ一致する削除も報告する", () => {
    // 区切りを見ずに前方一致で判定すると、巻き込んだ削除が登録内に見えて黙って通る。
    expect(
      findUnregisteredDeletions(["src/model/product"], ["src/model/products-extra/x.ts"]),
    ).toEqual(["登録外の削除を検出: src/model/products-extra/x.ts"]);
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

describe("findMissingRestorations", () => {
  // ----- 正常系 -----
  it("置き直したパスが在れば何も報告しない", () => {
    expect(findMissingRestorations(["src/app/page.tsx"], () => true)).toEqual([]);
  });

  it("置き直したはずのパスが無ければ報告する", () => {
    expect(findMissingRestorations(["src/app/page.tsx"], NOTHING_EXISTS)).toEqual([
      "置き直されていないパス: src/app/page.tsx",
    ]);
  });
});

describe("collectFailures", () => {
  // ----- 正常系 -----
  it("過不足も残留も無ければ空を返す", () => {
    expect(
      collectFailures({
        registeredPaths: ["src/a"],
        restoredPaths: [],
        pathExists: NOTHING_EXISTS,
        gitStatusPorcelain: " D src/a/b.ts",
        makeHelpOutput: "setup-repo",
        danglingHits: "",
      }),
    ).toEqual([]);
  });

  // ----- 異常系 -----
  it("5 種の失敗をまとめて返す", () => {
    const failures = collectFailures({
      registeredPaths: ["src/a"],
      restoredPaths: ["src/app/page.tsx"],
      // 登録パスは在り（未削除）、置き直す先は無い（未配置）。1 つの述語で両方を突く。
      pathExists: (relativePath) => relativePath !== "src/app/page.tsx",
      gitStatusPorcelain: " D src/other.ts",
      makeHelpOutput: "setup-remove-sample",
      danglingHits: "src/x.ts:1:商品",
    });

    // 件数だけを見ると、ある検査を落として別の検査を二重に呼んでも同じ数で通る。
    expect(failures).toEqual([
      "未削除の登録パス: src/a",
      "置き直されていないパス: src/app/page.tsx",
      "登録外の削除を検出: src/other.ts",
      "make ターゲット setup-remove-sample が残っています",
      "残留サンプル参照:\nsrc/x.ts:1:商品",
    ]);
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
