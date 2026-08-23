import { describe, expect, it } from "vitest";

import { buildChromeFlags, buildLighthouseArgs } from "./command";
import type { Target } from "./plan";

const TARGET: Target = { name: "home", url: "http://127.0.0.1:3300/", role: undefined };

/** 引数を組み立てる。既定は役割の要らない画面。 */
function args(headersFile?: string): string[] {
  return buildLighthouseArgs("/cli/index.js", TARGET, "tmp/lighthouse/home-1.json", headersFile, [
    "--headless=new",
  ]);
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

  it("ブラウザへの指定を 1 つの引数へ畳む", () => {
    expect(
      buildLighthouseArgs("/cli/index.js", TARGET, "out.json", undefined, [
        "--headless=new",
        "--no-sandbox",
      ]),
    ).toContain("--chrome-flags=--headless=new --no-sandbox");
  });

  it("ヘッダの宣言があれば、その場所を渡す", () => {
    expect(args("tmp/lighthouse/headers-admin.json")).toContain(
      "--extra-headers=tmp/lighthouse/headers-admin.json",
    );
  });

  // ----- 異常系 -----
  it("ヘッダの宣言が無ければ、ヘッダを渡さない", () => {
    expect(args().some((arg) => arg.startsWith("--extra-headers"))).toBe(false);
  });
});
