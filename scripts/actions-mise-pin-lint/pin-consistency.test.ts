import { describe, expect, it } from "vitest";

import { DIGEST_PREFIX_LENGTH, findViolations, type MisePin, readPin } from "./pin-consistency";

const VERSION = "2026.7.12";
const DIGEST = "dad54e0b843908324282b8673f9c0ebc3a4da0c49ad2da309a49bfbc918ba180";

/** 揃っている状態の材料。 */
function pin(overrides: Partial<MisePin> = {}): MisePin {
  return {
    version: VERSION,
    digest: DIGEST,
    cacheKey: `mise-\${{ runner.os }}-\${{ runner.arch }}-${VERSION}-${DIGEST.slice(0, DIGEST_PREFIX_LENGTH)}`,
    ...overrides,
  };
}

describe("DIGEST_PREFIX_LENGTH", () => {
  // ----- 正常系 -----
  it("キャッシュキーへ埋める digest の桁数を示す", () => {
    expect(DIGEST_PREFIX_LENGTH).toBe(8);
  });
});

describe("readPin", () => {
  // ----- 正常系 -----
  it("版 / digest / キャッシュキーを読み取る", () => {
    const source = [
      "        key: mise-Linux-X64-2026.7.12-dad54e0b",
      "      env:",
      `        MISE_VERSION: ${VERSION}`,
      `        MISE_SHA256: ${DIGEST}`,
    ].join("\n");

    expect(readPin(source)).toEqual({
      version: VERSION,
      digest: DIGEST,
      cacheKey: "mise-Linux-X64-2026.7.12-dad54e0b",
    });
  });

  // ----- 異常系 -----
  it("読み取れない値を null で返す", () => {
    expect(readPin("name: Setup mise")).toEqual({
      version: null,
      digest: null,
      cacheKey: null,
    });
  });
});

describe("findViolations", () => {
  // ----- 正常系 -----
  it("揃っていれば違反を報告しない", () => {
    expect(findViolations(pin())).toEqual([]);
  });

  // ----- 異常系 -----
  it("キャッシュキーが版を含まなければ落とす", () => {
    const violations = findViolations(pin({ cacheKey: `mise-Linux-X64-2026.6.0-dad54e0b` }));

    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain("キャッシュキーが版を含んでいません");
  });

  it("キャッシュキーが digest の先頭を含まなければ落とす", () => {
    const violations = findViolations(pin({ cacheKey: `mise-Linux-X64-${VERSION}-00000000` }));

    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain("digest の先頭");
  });

  it("読み取れない値をそれぞれ違反として報告する", () => {
    expect(findViolations({ version: null, digest: null, cacheKey: null })).toEqual([
      "MISE_VERSION を読み取れません",
      "MISE_SHA256 を読み取れません",
      "キャッシュの key を読み取れません",
    ]);
  });

  it("値を 1 つでも読み取れなければ突き合わせへ進まない", () => {
    expect(findViolations(pin({ version: null }))).toEqual(["MISE_VERSION を読み取れません"]);
  });
});
