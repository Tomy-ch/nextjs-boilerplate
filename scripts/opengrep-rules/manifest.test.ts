import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  RULES_CATEGORY,
  RULES_DIR,
  RULES_EXCLUDED_CATEGORY,
  RULES_LANGUAGES,
  RULES_LOCK_FILE,
  RULES_LOCK_FORMAT,
  RULES_REPO,
} from "./manifest";

describe("RULES_REPO", () => {
  // ----- 正常系 -----
  it("owner/repo の形で宣言する", () => {
    expect(RULES_REPO).toMatch(/^[\w.-]+\/[\w.-]+$/);
  });
});

describe("RULES_LOCK_FILE", () => {
  // ----- 正常系 -----
  it("追跡するロックファイルを指す", () => {
    expect(readFileSync(RULES_LOCK_FILE, "utf8")).toContain(RULES_REPO);
  });
});

describe("RULES_LOCK_FORMAT", () => {
  // ----- 正常系 -----
  it("値として取り出したルール集合の digest を受け取る", () => {
    expect(RULES_LOCK_FORMAT.value.test("0".repeat(64))).toBe(true);
  });

  // ----- 異常系 -----
  it("digest の形でない値を受け取らない", () => {
    expect(RULES_LOCK_FORMAT.value.test("0".repeat(40))).toBe(false);
    expect(RULES_LOCK_FORMAT.value.test("Z".repeat(64))).toBe(false);
  });
});

describe("RULES_DIR", () => {
  // ----- 正常系 -----
  it("追跡しない場所へ置く", () => {
    expect(RULES_DIR.startsWith("tmp/")).toBe(true);
  });

  it("opengrep へ渡す --config と同じ場所を指す", () => {
    // 宣言が 2 つある以上、片方だけを直した状態は必ず生まれる。ずれる向きは「ルールを
    // 置いた場所と読む場所が違う」で、opengrep は所見 0 件を返すため緑のまま検査が消える。
    const makefile = readFileSync(".makefiles/security/opengrep.mk", "utf8");

    expect(makefile).toContain(`OPENGREP_RULES_DIR := ${RULES_DIR}\n`);
  });
});

describe("RULES_LANGUAGES", () => {
  // ----- 正常系 -----
  it("このリポジトリが書く言語だけを取る", () => {
    expect([...RULES_LANGUAGES]).toEqual(["javascript", "typescript"]);
  });
});

describe("RULES_CATEGORY", () => {
  // ----- 正常系 -----
  it("security だけを取る", () => {
    expect(RULES_CATEGORY).toBe("security");
  });
});

describe("RULES_EXCLUDED_CATEGORY", () => {
  // ----- 正常系 -----
  it("ゲートに載せられない audit を捨てる", () => {
    expect(RULES_EXCLUDED_CATEGORY).toBe("audit");
  });
});
