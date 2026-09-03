import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  assertWithinRoot,
  buildSteps,
  canHoldMarker,
  findMisplacedRestorations,
  findRedundantPaths,
  isScanTarget,
} from "./plan";

const ROOT = path.resolve("/repo");

describe("assertWithinRoot", () => {
  // ----- 正常系 -----
  it("ルートの内側を指すパスを通す", () => {
    expect(() => assertWithinRoot("src/features/products", ROOT)).not.toThrow();
  });

  it("階層を戻ってから内側へ入るパスも、行き先が内側なら通す", () => {
    expect(() => assertWithinRoot("src/../mocks/api", ROOT)).not.toThrow();
  });

  // ----- 異常系 -----
  it("空のパスを断る", () => {
    expect(() => assertWithinRoot("", ROOT)).toThrow("空のパスは削除対象にできません");
  });

  it("絶対パスを断る", () => {
    expect(() => assertWithinRoot("/etc", ROOT)).toThrow("絶対パスは削除対象にできません");
  });

  it("ルート自身を指すパスを断る", () => {
    expect(() => assertWithinRoot(".", ROOT)).toThrow("リポジトリルート自身は削除対象にできません");
  });

  it("ルートの外へ出るパスを断る", () => {
    expect(() => assertWithinRoot("../secrets", ROOT)).toThrow("リポジトリの外を指しています");
  });
});

describe("buildSteps", () => {
  // ----- 正常系 -----
  it("マーカー除去・置き直し・削除をこの順に並べる", () => {
    const steps = buildSteps(
      ["mocks/handlers.ts"],
      ["src/features/products"],
      [{ from: "scripts/setup/remove-sample/templates/x.template", to: "src/app/page.tsx" }],
      ROOT,
    );

    expect(steps).toEqual([
      { kind: "strip", relativePath: "mocks/handlers.ts" },
      {
        kind: "restore",
        from: "scripts/setup/remove-sample/templates/x.template",
        to: "src/app/page.tsx",
      },
      { kind: "delete", relativePath: "src/features/products" },
    ]);
  });

  it("対象が無ければ空の手順を返す", () => {
    expect(buildSteps([], [], [], ROOT)).toEqual([]);
  });

  // ----- 異常系 -----
  it("削除対象がリポジトリの外を指していれば手順を組まない", () => {
    expect(() => buildSteps([], ["../outside"], [], ROOT)).toThrow("リポジトリの外を指しています");
  });

  it("置き直しの雛形がリポジトリの外を指していれば手順を組まない", () => {
    expect(() =>
      buildSteps([], [], [{ from: "../outside.template", to: "src/app/page.tsx" }], ROOT),
    ).toThrow("リポジトリの外を指しています");
  });

  it("置き直す先がリポジトリの外を指していれば手順を組まない", () => {
    expect(() =>
      buildSteps([], [], [{ from: "scripts/x.template", to: "../outside.tsx" }], ROOT),
    ).toThrow("リポジトリの外を指しています");
  });
});

describe("findMisplacedRestorations", () => {
  // ----- 正常系 -----
  it("雛形が削除対象の内側、置き直す先が外側なら何も報告しない", () => {
    expect(
      findMisplacedRestorations(
        [{ from: "scripts/setup/remove-sample/templates/x.template", to: "src/app/page.tsx" }],
        ["scripts/setup/remove-sample", "src/app/(shop)"],
      ),
    ).toEqual([]);
  });

  // ----- 異常系 -----
  it("置き直す先が削除対象の内側にあれば報告する", () => {
    expect(
      findMisplacedRestorations(
        [{ from: "scripts/setup/remove-sample/x.template", to: "src/app/(shop)/page.tsx" }],
        ["scripts/setup/remove-sample", "src/app/(shop)"],
      ),
    ).toEqual(["置き直す先が削除対象の内側にあります: src/app/(shop)/page.tsx"]);
  });

  it("雛形が削除対象の外にあれば報告する", () => {
    expect(
      findMisplacedRestorations(
        [{ from: "scripts/templates/x.template", to: "src/app/page.tsx" }],
        ["scripts/setup/remove-sample"],
      ),
    ).toEqual(["雛形が削除対象の外にあります: scripts/templates/x.template"]);
  });

  it("削除対象そのものを指す先も内側として報告する", () => {
    expect(
      findMisplacedRestorations(
        [{ from: "scripts/setup/remove-sample/x.template", to: "src/app/global-nav.ts" }],
        ["scripts/setup/remove-sample", "src/app/global-nav.ts"],
      ),
    ).toEqual(["置き直す先が削除対象の内側にあります: src/app/global-nav.ts"]);
  });
});

describe("findRedundantPaths", () => {
  // ----- 正常系 -----
  it("他の対象に含まれる宣言を報告する", () => {
    expect(findRedundantPaths(["src/features", "src/features/products"])).toEqual([
      "他の対象に含まれる宣言: src/features/products",
    ]);
  });

  it("互いに含まない宣言だけなら何も報告しない", () => {
    expect(findRedundantPaths(["src/features/products", "src/features/cart"])).toEqual([]);
  });

  it("接頭辞が途中まで一致するだけの宣言は含まれているとみなさない", () => {
    expect(findRedundantPaths(["src/model/product", "src/model/products-extra"])).toEqual([]);
  });
});

describe("isScanTarget", () => {
  // ----- 正常系 -----
  it("除外に当たらないファイルは走査する", () => {
    expect(isScanTarget("src/app/layout.tsx", ["tmp/"], [])).toBe(true);
  });

  it("マーカーをデータとして持つファイルは走査しない", () => {
    expect(
      isScanTarget("scripts/setup/lib/markers.test.ts", [], ["scripts/setup/lib/markers.test.ts"]),
    ).toBe(false);
  });

  it("除外の接頭辞に当たるファイルは走査しない", () => {
    expect(isScanTarget("tmp/work.ts", ["tmp/"], [])).toBe(false);
  });

  it("接頭辞が途中まで一致するだけなら走査する", () => {
    expect(isScanTarget("tmpfile.ts", ["tmp/"], [])).toBe(true);
  });
});

describe("canHoldMarker", () => {
  // ----- 正常系 -----
  it("コメントを書ける形式は走査する", () => {
    expect(canHoldMarker("src/app/layout.tsx", [".png"])).toBe(true);
  });

  it("マーカーを持てない拡張子は走査しない", () => {
    expect(canHoldMarker("src/app/favicon.ico", [".ico", ".png"])).toBe(false);
  });

  it("大文字の拡張子も同じに扱う", () => {
    expect(canHoldMarker("public/LOGO.PNG", [".png"])).toBe(false);
  });
});
