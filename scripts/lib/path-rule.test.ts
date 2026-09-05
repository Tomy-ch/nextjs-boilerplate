import { describe, expect, it } from "vitest";

import { matchesPathRule, type PathRule } from "./path-rule";

/** 規則 1 件。理由は当たり判定に効かないので固定する。 */
function rule(...globs: string[]): PathRule {
  return { globs, reason: "理由" };
}

describe("matchesPathRule", () => {
  // ----- 正常系 -----
  it("いずれかの glob に当たるパスが 1 つでもあれば当たる", () => {
    expect(matchesPathRule(rule("src/app/**/layout.tsx"), ["src/app/(site-info)/layout.tsx"])).toBe(
      true,
    );
  });

  it("glob を複数持てば、そのどれか 1 つで当たる", () => {
    const target = rule("src/app/globals.css", "src/components/**/*.css");

    expect(matchesPathRule(target, ["src/components/design-system/reset.css"])).toBe(true);
    expect(matchesPathRule(target, ["src/app/globals.css"])).toBe(true);
  });

  it("当たるパスと当たらないパスが混ざっていても当たる", () => {
    expect(matchesPathRule(rule("e2e/lib/screens.ts"), ["README.md", "e2e/lib/screens.ts"])).toBe(
      true,
    );
  });

  // ----- 異常系 -----
  it("当たるパスが 1 つも無ければ当たらない", () => {
    expect(matchesPathRule(rule("src/app/**/layout.tsx"), ["src/app/(site-info)/page.tsx"])).toBe(
      false,
    );
  });

  it("末尾が一致するだけのパスは当たらない", () => {
    expect(matchesPathRule(rule("e2e/lib/screens.ts"), ["packages/e2e/lib/screens.ts"])).toBe(
      false,
    );
  });

  it("パスが 1 つも無ければ当たらない", () => {
    expect(matchesPathRule(rule("src/app/**/layout.tsx"), [])).toBe(false);
  });

  it("glob を 1 つも持たない規則は当たらない", () => {
    expect(matchesPathRule(rule(), ["src/app/layout.tsx"])).toBe(false);
  });
});
