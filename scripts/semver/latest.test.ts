import { describe, expect, it } from "vitest";

import { selectLatestVersion } from "./latest";

describe("selectLatestVersion", () => {
  // ----- 正常系 -----
  it("並び順に関わらず最も大きい版を返す", () => {
    expect(selectLatestVersion(["v1.0.0", "v2.0.0", "v1.5.0"])).toBe("v2.0.0");
  });

  it("桁を数として比べる", () => {
    expect(selectLatestVersion(["v0.9.0", "v0.10.0"])).toBe("v0.10.0");
    expect(selectLatestVersion(["v1.2.9", "v1.2.10"])).toBe("v1.2.10");
  });

  it("同じ版が並んでも 1 本だけ返す", () => {
    expect(selectLatestVersion(["v1.0.0", "v1.0.0"])).toBe("v1.0.0");
  });

  it("端の空白を落として返す", () => {
    expect(selectLatestVersion(["v1.0.0\r", " v1.1.0 "])).toBe("v1.1.0");
  });

  // ----- 異常系 -----
  it("リリースの表記でないタグを数えない", () => {
    expect(selectLatestVersion(["v1.0.0", "v2.0.0-rc.1", "2.1.0", "nightly"])).toBe("v1.0.0");
  });

  it("リリースタグが 1 本も無ければ null を返す", () => {
    expect(selectLatestVersion([])).toBeNull();
    expect(selectLatestVersion(["nightly", ""])).toBeNull();
  });
});
