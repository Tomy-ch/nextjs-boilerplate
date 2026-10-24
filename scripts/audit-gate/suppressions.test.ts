import { describe, expect, it } from "vitest";

import { parseSuppressions } from "./suppressions";

const NOW = new Date("2026-10-24T00:00:00Z");

function config(...entries: readonly string[]): string {
  return entries.map((entry) => `[[IgnoredVulns]]\n${entry}\n`).join("\n");
}

describe("parseSuppressions", () => {
  // ----- 正常系 -----
  it("期限が来ていない抑止の ID を返す", () => {
    const text = config('id = "GHSA-aaaa-aaaa-aaaa"\nignoreUntil = 2026-11-07\nreason = "理由"');

    expect([...parseSuppressions(text, NOW)]).toEqual(["GHSA-aaaa-aaaa-aaaa"]);
  });

  it("期限を持たない抑止の ID を返す", () => {
    const text = config('id = "GHSA-aaaa-aaaa-aaaa"\nreason = "理由"');

    expect([...parseSuppressions(text, NOW)]).toEqual(["GHSA-aaaa-aaaa-aaaa"]);
  });

  it("抑止が 1 件も無い設定を空として読む", () => {
    expect(parseSuppressions("", NOW).size).toBe(0);
  });

  // ----- 異常系 -----
  it("期限を過ぎた抑止は効かせない", () => {
    const text = config(
      'id = "GHSA-aaaa-aaaa-aaaa"\nignoreUntil = 2026-10-23\nreason = "理由"',
      'id = "GHSA-bbbb-bbbb-bbbb"\nignoreUntil = 2026-10-25\nreason = "理由"',
    );

    expect([...parseSuppressions(text, NOW)]).toEqual(["GHSA-bbbb-bbbb-bbbb"]);
  });

  it("期限の当日になった抑止は効かせない", () => {
    const text = config('id = "GHSA-aaaa-aaaa-aaaa"\nignoreUntil = 2026-10-24\nreason = "理由"');

    expect(parseSuppressions(text, NOW).size).toBe(0);
  });

  it("ID を欠く抑止を落とす", () => {
    expect(() => parseSuppressions(config('reason = "理由"'), NOW)).toThrow();
  });

  it("TOML として読めない設定を落とす", () => {
    expect(() => parseSuppressions("[[IgnoredVulns", NOW)).toThrow();
  });
});
