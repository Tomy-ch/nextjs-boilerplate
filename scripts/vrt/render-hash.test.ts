import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { collectRenderInputs, decideGate, renderInputsHash } from "./render-hash";

let root: string;

/** リポジトリルートに見立てた木へファイルを置く。 */
function place(relative: string, content = ""): void {
  const file = join(root, relative);
  mkdirSync(join(file, ".."), { recursive: true });
  writeFileSync(file, content);
}

/** 入力の最小構成。これだけあれば列挙は成立する。 */
function placeInputs(): void {
  place("storybook-static/index.json", "{}");
  place("playwright.config.ts", "config");
  place("vrt/stories.spec.ts", "spec");
  place("docker-compose.dev-tools.yml", "compose");
  place("pnpm-lock.yaml", "lock");
}

const hashOf = (): string => renderInputsHash(root, collectRenderInputs(root));

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "render-hash-"));
});

afterEach(() => {
  rmSync(root, { force: true, recursive: true });
});

describe("collectRenderInputs", () => {
  // ----- 正常系 -----
  it("撮る対象・撮り方・撮る環境・検査の実装を列挙する", () => {
    placeInputs();

    expect(collectRenderInputs(root)).toEqual([
      "docker-compose.dev-tools.yml",
      "playwright.config.ts",
      "pnpm-lock.yaml",
      "storybook-static/index.json",
      "vrt/stories.spec.ts",
    ]);
  });

  it("build ごとに変わる metadata を外す", () => {
    placeInputs();
    place("storybook-static/project.json", "{}");

    expect(collectRenderInputs(root)).not.toContain("storybook-static/project.json");
  });

  it("基準画像そのものを外す", () => {
    placeInputs();
    place("vrt/screenshots/action/light/a--x.png");

    expect(collectRenderInputs(root)).not.toContain("vrt/screenshots/action/light/a--x.png");
  });

  it("vrt 配下の散文とテストを外す", () => {
    placeInputs();
    place("vrt/README.md", "散文");
    place("vrt/lib/clock.test.ts", "test");

    expect(collectRenderInputs(root)).toEqual([
      "docker-compose.dev-tools.yml",
      "playwright.config.ts",
      "pnpm-lock.yaml",
      "storybook-static/index.json",
      "vrt/stories.spec.ts",
    ]);
  });

  it("入れ子のディレクトリを辿る", () => {
    placeInputs();
    place("storybook-static/assets/main.js", "js");

    expect(collectRenderInputs(root)).toContain("storybook-static/assets/main.js");
  });

  // ----- 異常系 -----
  it("入力が欠けていれば落とす", () => {
    place("playwright.config.ts", "config");

    expect(() => collectRenderInputs(root)).toThrow();
  });
});

describe("renderInputsHash", () => {
  // ----- 正常系 -----
  it("同じ入力からは同じ値になる", () => {
    placeInputs();

    expect(hashOf()).toBe(hashOf());
  });

  it("中身が変われば値が変わる", () => {
    placeInputs();
    const before = hashOf();
    place("vrt/stories.spec.ts", "spec を書き換えた");

    expect(hashOf()).not.toBe(before);
  });

  it("ファイルが増えれば値が変わる", () => {
    placeInputs();
    const before = hashOf();
    place("storybook-static/assets/main.js", "js");

    expect(hashOf()).not.toBe(before);
  });

  it("中身が同じでも名前が違えば値が変わる", () => {
    placeInputs();
    place("storybook-static/a.js", "同じ中身");
    const before = hashOf();
    rmSync(join(root, "storybook-static/a.js"));
    place("storybook-static/b.js", "同じ中身");

    expect(hashOf()).not.toBe(before);
  });
});

describe("decideGate", () => {
  // ----- 正常系 -----
  it("記録と現在が同じなら省く", () => {
    expect(decideGate(["abc"], "abc")).toBe("skip");
  });

  it("記録の前後の空白を無視する", () => {
    expect(decideGate(["abc\n"], "abc")).toBe("skip");
  });

  it("記録と現在が違えば撮る", () => {
    expect(decideGate(["abc"], "def")).toBe("run");
  });

  it("複数の記録のどれか 1 つが一致すれば省く", () => {
    expect(decideGate(["def", "abc"], "abc")).toBe("skip");
  });

  it("複数の記録がどれも違えば撮る", () => {
    expect(decideGate(["def", "ghi"], "abc")).toBe("run");
  });

  // ----- 異常系 -----
  it("記録が無ければ撮る", () => {
    expect(decideGate([null], "abc")).toBe("run");
  });

  it("記録を 1 つも渡されなければ撮る", () => {
    expect(decideGate([], "abc")).toBe("run");
  });
});
