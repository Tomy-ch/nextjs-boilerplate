import { describe, expect, it } from "vitest";

import { type Advisory, isBlocking, parseAudit } from "./advisories";

function raw(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    module_name: "postcss",
    severity: "high",
    title: "PostCSS: Path Traversal",
    url: "https://github.com/advisories/GHSA-r28c-9q8g-f849",
    patched_versions: ">=8.5.18",
    findings: [{ paths: [".>next>postcss"] }],
    ...overrides,
  };
}

function audit(advisories: Record<string, unknown>): string {
  return JSON.stringify({ advisories });
}

function advisory(overrides: Partial<Advisory> = {}): Advisory {
  return {
    module: "postcss",
    severity: "high",
    title: "PostCSS: Path Traversal",
    url: "https://github.com/advisories/GHSA-r28c-9q8g-f849",
    patched: ">=8.5.18",
    paths: [".>next>postcss"],
    ...overrides,
  };
}

describe("parseAudit", () => {
  // ----- 正常系 -----
  it("検出を判定に要る欄だけへ畳む", () => {
    expect(parseAudit(audit({ "1": raw() }))).toEqual([advisory()]);
  });

  it("修正版なしの印を undefined へ落とす", () => {
    expect(
      parseAudit(audit({ "1": raw({ patched_versions: "<0.0.0" }) }))[0]?.patched,
    ).toBeUndefined();
  });

  it("複数の finding の経路を 1 つに畳む", () => {
    const findings = [{ paths: [".>postcss"] }, { paths: [".>next>postcss"] }];

    expect(parseAudit(audit({ "1": raw({ findings }) }))[0]?.paths).toEqual([
      ".>postcss",
      ".>next>postcss",
    ]);
  });

  it("finding を持たない検出の経路を空にする", () => {
    expect(parseAudit(audit({ "1": raw({ findings: undefined }) }))[0]?.paths).toEqual([]);
  });

  it("パッケージ名の昇順に並べる", () => {
    const parsed = parseAudit(
      audit({ "1": raw({ module_name: "sharp" }), "2": raw({ module_name: "nanoid" }) }),
    );

    expect(parsed.map((entry) => entry.module)).toEqual(["nanoid", "sharp"]);
  });

  it("検出が 0 件で advisories ごと欠けた出力を空として読む", () => {
    expect(parseAudit(JSON.stringify({ metadata: {} }))).toEqual([]);
  });

  // ----- 異常系 -----
  it("JSON として読めない出力を落とす", () => {
    expect(() => parseAudit("not json")).toThrow();
  });

  it("必須の欄を欠く検出を落とす", () => {
    expect(() => parseAudit(audit({ "1": raw({ severity: undefined }) }))).toThrow();
  });
});

describe("isBlocking", () => {
  // ----- 正常系 -----
  it("修正版のある high を止める", () => {
    expect(isBlocking(advisory())).toBe(true);
  });

  it("修正版のある critical を止める", () => {
    expect(isBlocking(advisory({ severity: "critical" }))).toBe(true);
  });

  it("修正版の無い high を止めない", () => {
    expect(isBlocking(advisory({ patched: undefined }))).toBe(false);
  });

  it("修正版があっても moderate を止めない", () => {
    expect(isBlocking(advisory({ severity: "moderate" }))).toBe(false);
  });
});
