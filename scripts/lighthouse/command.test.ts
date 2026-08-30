import { describe, expect, it } from "vitest";

import { buildChromeFlags, buildLighthouseArgs } from "./command";
import type { Target } from "./plan";

const TARGET: Target = { name: "home", url: "http://127.0.0.1:3300/", role: undefined };

/** 引数を組み立てる。 */
function args(): string[] {
  return buildLighthouseArgs("/cli/index.js", TARGET, "tmp/lighthouse/home-1.json", 9222);
}

describe("buildChromeFlags", () => {
  // ----- 正常系 -----
  it("手元では sandbox を外さない", () => {
    expect(buildChromeFlags({})).toEqual(["--headless=new"]);
  });

  it("CI では sandbox を外す", () => {
    expect(buildChromeFlags({ CI: "true" })).toEqual(["--headless=new", "--no-sandbox"]);
  });

  it("CI が空文字でも、値が在る以上は CI として扱う", () => {
    expect(buildChromeFlags({ CI: "" })).toContain("--no-sandbox");
  });
});

describe("buildLighthouseArgs", () => {
  // ----- 正常系 -----
  it("CLI の入口を先頭に置き、開く URL を続ける", () => {
    expect(args().slice(0, 2)).toEqual(["/cli/index.js", "http://127.0.0.1:3300/"]);
  });

  it("結果の書き出し先を渡す", () => {
    expect(args()).toContain("--output-path=tmp/lighthouse/home-1.json");
  });

  it("performance だけを測る", () => {
    expect(args()).toContain("--only-categories=performance");
  });

  it("応答が 2xx でない画面も測る", () => {
    expect(args()).toContain("--ignore-status-code");
  });

  it("立ち上げ済みのブラウザへ繋ぐ。ここでは起動しない", () => {
    expect(args()).toContain("--port=9222");
  });

  it("開く前に置いた cookie を消させない", () => {
    expect(args()).toContain("--disable-storage-reset");
  });

  // ----- 異常系 -----
  it("ブラウザを自分で起動する指定は渡さない", () => {
    expect(args().some((arg) => arg.startsWith("--chrome-flags"))).toBe(false);
  });
});
