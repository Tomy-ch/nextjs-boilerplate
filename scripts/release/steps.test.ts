import { describe, expect, it } from "vitest";

import { logStep, runStep } from "./steps";

describe("logStep", () => {
  // ----- 正常系 -----
  it("出す 1 行をそのまま持つ", () => {
    expect(logStep("✅ 完了")).toEqual({ kind: "log", message: "✅ 完了" });
  });
});

describe("runStep", () => {
  // ----- 正常系 -----
  it("コマンドと引数を分けて持つ", () => {
    expect(runStep("git", ["fetch", "--tags", "origin"])).toEqual({
      kind: "run",
      command: "git",
      args: ["fetch", "--tags", "origin"],
    });
  });
});
