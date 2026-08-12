import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  assertWithinRoot,
  buildSteps,
  canHoldMarker,
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
  it("マーカー除去を削除より先に並べる", () => {
    const steps = buildSteps(["mocks/handlers.ts"], ["src/features/products"], ROOT);

    expect(steps).toEqual([
      { kind: "strip", relativePath: "mocks/handlers.ts" },
      { kind: "delete", relativePath: "src/features/products" },
    ]);
  });

  it("対象が無ければ空の手順を返す", () => {
    expect(buildSteps([], [], ROOT)).toEqual([]);
  });

  // ----- 異常系 -----
  it("削除対象がリポジトリの外を指していれば手順を組まない", () => {
    expect(() => buildSteps([], ["../outside"], ROOT)).toThrow("リポジトリの外を指しています");
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
