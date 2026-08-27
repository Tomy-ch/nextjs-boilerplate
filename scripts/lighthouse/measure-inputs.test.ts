import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { collectMeasureInputs, measureInputsHash } from "./measure-inputs";

let root: string;

/** リポジトリルートに見立てた木へファイルを置く。 */
function place(relative: string, content = ""): void {
  const file = join(root, relative);
  mkdirSync(join(file, ".."), { recursive: true });
  writeFileSync(file, content);
}

/** 入力の最小構成。これだけあれば列挙は成立する。 */
function placeInputs(): void {
  place("src/app/page.tsx", "page");
  place("public/favicon.ico", "icon");
  place("mocks/handlers.ts", "handlers");
  place("e2e/lib/screens.ts", "screens");
  place("scripts/lighthouse/index.ts", "entry");
  place("performance-budget.yaml", "budget");
  place("next.config.ts", "next");
  place("postcss.config.mjs", "postcss");
  place("tsconfig.json", "{}");
  place("tokens/generated/tokens.css", "css");
  place("env/.env.ci", "env");
  place("mise.toml", "mise");
  place("pnpm-lock.yaml", "lock");
}

const hashOf = (): string => measureInputsHash(root, collectMeasureInputs(root));

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "measure-inputs-"));
  placeInputs();
});

afterEach(() => {
  rmSync(root, { force: true, recursive: true });
});

describe("collectMeasureInputs", () => {
  // ----- 正常系 -----
  it("測る対象・測り方・照らす上限・build の設定を列挙する", () => {
    expect(collectMeasureInputs(root)).toEqual([
      "e2e/lib/screens.ts",
      "env/.env.ci",
      "mise.toml",
      "mocks/handlers.ts",
      "next.config.ts",
      "performance-budget.yaml",
      "pnpm-lock.yaml",
      "postcss.config.mjs",
      "public/favicon.ico",
      "scripts/lighthouse/index.ts",
      "src/app/page.tsx",
      "tokens/generated/tokens.css",
      "tsconfig.json",
    ]);
  });

  it("散文は入力に数えない", () => {
    place("src/features/README.md", "prose");

    expect(collectMeasureInputs(root)).not.toContain("src/features/README.md");
  });

  it("story は入力に数えない", () => {
    place("src/app/page.stories.tsx", "story");

    expect(collectMeasureInputs(root)).not.toContain("src/app/page.stories.tsx");
  });

  it("テストは入力に数えない", () => {
    place("src/app/page.test.tsx", "test");
    place("scripts/lighthouse/shard.test.ts", "test");

    expect(collectMeasureInputs(root)).not.toContain("src/app/page.test.tsx");
    expect(collectMeasureInputs(root)).not.toContain("scripts/lighthouse/shard.test.ts");
  });

  // ----- 異常系 -----
  it("入力が 1 つでも欠けていれば例外を投げる", () => {
    rmSync(join(root, "performance-budget.yaml"));

    expect(() => collectMeasureInputs(root)).toThrow();
  });
});

describe("measureInputsHash", () => {
  // ----- 正常系 -----
  it("同じ木からは同じ値になる", () => {
    expect(hashOf()).toBe(hashOf());
  });

  it("測る対象が変われば値が変わる", () => {
    const before = hashOf();
    place("src/app/page.tsx", "changed");

    expect(hashOf()).not.toBe(before);
  });

  it("照らす上限が変われば値が変わる", () => {
    const before = hashOf();
    place("performance-budget.yaml", "changed");

    expect(hashOf()).not.toBe(before);
  });

  it("story を足しても値は変わらない", () => {
    const before = hashOf();
    place("src/app/page.stories.tsx", "story");

    expect(hashOf()).toBe(before);
  });
});
