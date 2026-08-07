import { describe, expect, it } from "vitest";

import { bumpVersion, isBumpType, normalizeVersion } from "./bump";

describe("isBumpType", () => {
  // ----- 正常系 -----
  it("patch / minor / major を進め方として受け入れる", () => {
    expect(isBumpType("patch")).toBe(true);
    expect(isBumpType("minor")).toBe(true);
    expect(isBumpType("major")).toBe(true);
  });

  // ----- 異常系 -----
  it("進め方でない指定を拒否する", () => {
    expect(isBumpType("prerelease")).toBe(false);
    expect(isBumpType("")).toBe(false);
  });
});

describe("normalizeVersion", () => {
  // ----- 正常系 -----
  it("v 付きと v 無しの双方から X.Y.Z を取り出す", () => {
    expect(normalizeVersion("v1.2.3")).toBe("1.2.3");
    expect(normalizeVersion("1.2.3")).toBe("1.2.3");
  });

  // ----- 異常系 -----
  it("桁が足りない版を拒否する", () => {
    expect(normalizeVersion("1.2")).toBeNull();
  });

  it("数字以外を含む版を拒否する", () => {
    expect(normalizeVersion("1.2.3-rc.1")).toBeNull();
    expect(normalizeVersion("va.b.c")).toBeNull();
  });
});

describe("bumpVersion", () => {
  // ----- 正常系 -----
  it("patch は末尾だけを進める", () => {
    expect(bumpVersion("1.2.3", "patch")).toBe("v1.2.4");
  });

  it("minor は patch を 0 へ戻す", () => {
    expect(bumpVersion("1.2.3", "minor")).toBe("v1.3.0");
  });

  it("major は minor と patch を 0 へ戻す", () => {
    expect(bumpVersion("1.2.3", "major")).toBe("v2.0.0");
  });
});
