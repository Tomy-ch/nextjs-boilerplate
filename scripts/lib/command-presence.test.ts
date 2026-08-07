import { afterEach, describe, expect, it, vi } from "vitest";

const execFileSyncMock = vi.hoisted(() => vi.fn());

vi.mock("node:child_process", () => ({ execFileSync: execFileSyncMock }));

import { isCommandOnPath } from "./command-presence";

afterEach(() => {
  execFileSyncMock.mockReset();
});

describe("isCommandOnPath", () => {
  // ----- 正常系 -----
  it("起動できるコマンドを居るものとして扱う", () => {
    execFileSyncMock.mockReturnValue("");

    expect(isCommandOnPath("claude")).toBe(true);
  });

  it("非ゼロで終わるコマンドも居るものとして扱う", () => {
    execFileSyncMock.mockImplementation(() => {
      throw Object.assign(new Error("exit 1"), { status: 1 });
    });

    expect(isCommandOnPath("claude")).toBe(true);
  });

  // ----- 異常系 -----
  it("PATH に無いコマンドを居ないものとして扱う", () => {
    execFileSyncMock.mockImplementation(() => {
      throw Object.assign(new Error("not found"), { code: "ENOENT" });
    });

    expect(isCommandOnPath("claude")).toBe(false);
  });
});
