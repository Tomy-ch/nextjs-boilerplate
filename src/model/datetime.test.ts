import { describe, expect, it } from "vitest";

import { formatDateTime } from "./datetime";

/** バックエンドが返す形と同じ、タイムゾーンを含む絶対時刻。 */
const PUBLISHED_AT = new Date("2026-08-12T00:05:00.000Z");

describe("formatDateTime", () => {
  // ----- 正常系 -----
  it("既定の locale で日付と時刻を並べる", () => {
    expect(formatDateTime(PUBLISHED_AT)).toBe("2026/08/12 9:05");
  });

  it("locale を明示すればその表記にする", () => {
    expect(formatDateTime(PUBLISHED_AT, "en-US")).toBe("Aug 12, 2026, 9:05 AM");
  });

  it("UTC とは日付が変わる時刻を既定のタイムゾーンで示す", () => {
    expect(formatDateTime(new Date("2026-08-11T15:30:00.000Z"))).toBe("2026/08/12 0:30");
  });

  it("同じ locale を繰り返し渡しても同じ表記になる", () => {
    expect(formatDateTime(PUBLISHED_AT)).toBe(formatDateTime(PUBLISHED_AT));
  });
});
