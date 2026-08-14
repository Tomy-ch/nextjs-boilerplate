import * as playwright from "@playwright/test";
import { describe, expect, it } from "vitest";

import { deviceFor, ENGINES, SHOT_ENGINE } from "./browsers";

describe("ENGINES", () => {
  // ----- 正常系 -----
  it("Playwright が起動できるエンジンだけを並べる", () => {
    // 綴りを誤ったエンジンは project を宣言した時点では通り、実行時に初めて落ちる。
    expect(ENGINES.filter((engine) => engine in playwright)).toEqual([...ENGINES]);
  });

  it("同じエンジンを 2 度並べない", () => {
    expect(new Set(ENGINES).size).toBe(ENGINES.length);
  });
});

describe("SHOT_ENGINE", () => {
  // ----- 正常系 -----
  it("回すエンジンの中から選ばれている", () => {
    expect(ENGINES).toContain(SHOT_ENGINE);
  });
});

describe("deviceFor", () => {
  // ----- 正常系 -----
  it("chromium にそのエンジンで動くデバイスを対応させる", () => {
    expect(playwright.devices[deviceFor("chromium")]?.defaultBrowserType).toBe("chromium");
  });

  it("firefox にそのエンジンで動くデバイスを対応させる", () => {
    expect(playwright.devices[deviceFor("firefox")]?.defaultBrowserType).toBe("firefox");
  });

  it("webkit にそのエンジンで動くデバイスを対応させる", () => {
    expect(playwright.devices[deviceFor("webkit")]?.defaultBrowserType).toBe("webkit");
  });
});
