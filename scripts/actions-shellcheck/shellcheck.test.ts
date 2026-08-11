import { afterEach, describe, expect, it, vi } from "vitest";

const spawnSyncMock = vi.hoisted(() => vi.fn());

vi.mock("node:child_process", () => ({ spawnSync: spawnSyncMock }));

import type { CompositeStep } from "./composite-step";
import {
  assertShellcheckAvailable,
  checkStep,
  maskExpressions,
  remapFindings,
  ShellcheckError,
  shebangFor,
} from "./shellcheck";

/** `${{ body }}` の式を組み立てる。 */
const expr = (body: string): string => `\${{ ${body} }}`;

const step = (overrides: Partial<CompositeStep> = {}): CompositeStep => ({
  file: ".github/actions/setup/action.yml",
  shell: "bash",
  script: "echo hello\n",
  firstLine: 6,
  columnBase: 8,
  ...overrides,
});

afterEach(() => {
  spawnSyncMock.mockReset();
});

describe("ShellcheckError", () => {
  // ----- 正常系 -----
  it("Error として文言を保つ", () => {
    const error = new ShellcheckError("失敗");

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe("失敗");
  });
});

describe("assertShellcheckAvailable", () => {
  // ----- 正常系 -----
  it("起動できれば何も投げない", () => {
    spawnSyncMock.mockReturnValue({ error: undefined });

    expect(() => assertShellcheckAvailable()).not.toThrow();
  });

  // ----- 異常系 -----
  it("PATH に無ければ導入手順を添えて落とす", () => {
    spawnSyncMock.mockReturnValue({ error: new Error("ENOENT") });

    expect(() => assertShellcheckAvailable()).toThrow(ShellcheckError);
    expect(() => assertShellcheckAvailable()).toThrow(/shellcheck が PATH にありません/);
  });
});

describe("shebangFor", () => {
  // ----- 正常系 -----
  it("bash と sh に対応する shebang を返す", () => {
    expect(shebangFor("bash")).toBe("#!/usr/bin/env bash");
    expect(shebangFor("sh")).toBe("#!/bin/sh");
  });

  it("絶対パスで書かれた方言も名前で判別する", () => {
    expect(shebangFor("/usr/bin/bash")).toBe("#!/usr/bin/env bash");
  });

  it("env と変数代入の前置きを読み飛ばす", () => {
    expect(shebangFor("env FOO=bar bash")).toBe("#!/usr/bin/env bash");
  });

  // ----- 異常系 -----
  it("対象外の方言には null を返す", () => {
    expect(shebangFor("pwsh")).toBeNull();
    expect(shebangFor("python")).toBeNull();
  });

  it("方言が式で与えられていれば null を返す", () => {
    expect(shebangFor(expr("inputs.shell"))).toBeNull();
  });

  it("前置きだけで方言が無ければ null を返す", () => {
    expect(shebangFor("env FOO=bar")).toBeNull();
  });
});

describe("maskExpressions", () => {
  // ----- 正常系 -----
  it("式を語へ潰す", () => {
    expect(maskExpressions(`echo ${expr("inputs.name")}`)).toBe("echo GH_EXPR");
  });

  it("式が跨いだ改行をプレースホルダの後ろへ移し、行番号を保つ", () => {
    const script = `echo \${{\n  inputs.name\n}}\necho done`;

    expect(maskExpressions(script)).toBe("echo GH_EXPR\n\n\necho done");
  });

  it("クォートの中の }} で打ち切らない", () => {
    expect(maskExpressions(expr("format('}}', inputs.name)"))).toBe("GH_EXPR");
  });

  it("式を含まない本文をそのまま返す", () => {
    expect(maskExpressions("echo hello\n")).toBe("echo hello\n");
  });

  // ----- 異常系 -----
  it("閉じていない式を落とす", () => {
    expect(() => maskExpressions("echo ${{ inputs.name")).toThrow(ShellcheckError);
  });
});

describe("checkStep", () => {
  // ----- 正常系 -----
  it("指摘が無ければ空を返す", () => {
    spawnSyncMock.mockReturnValue({ status: 0, stdout: "", stderr: "" });

    expect(checkStep(step(), "#!/usr/bin/env bash")).toEqual([]);
  });

  it("shebang を先頭へ足した本文を渡す", () => {
    spawnSyncMock.mockReturnValue({ status: 0, stdout: "", stderr: "" });

    checkStep(step(), "#!/usr/bin/env bash");

    expect(spawnSyncMock.mock.calls[0]?.[2]).toMatchObject({
      input: "#!/usr/bin/env bash\necho hello\n",
    });
  });

  it("指摘があれば位置を写し戻して返す", () => {
    spawnSyncMock.mockReturnValue({
      status: 1,
      stdout: "-:2:5: note: 指摘\n",
      stderr: "",
    });

    expect(checkStep(step(), "#!/usr/bin/env bash")).toEqual([
      "  .github/actions/setup/action.yml:6:13: note: 指摘",
    ]);
  });

  // ----- 異常系 -----
  it("式が閉じていなければ位置を添えて落とす", () => {
    expect(() => checkStep(step({ script: "echo ${{ x" }), "#!/bin/sh")).toThrow(
      /action\.yml:6: 閉じていない/,
    );
  });

  it("起動そのものに失敗したら落とす", () => {
    spawnSyncMock.mockReturnValue({ error: new Error("ENOENT") });

    expect(() => checkStep(step(), "#!/bin/sh")).toThrow(/実行に失敗しました: ENOENT/);
  });

  it("指摘以外の非ゼロ終了を落とす", () => {
    spawnSyncMock.mockReturnValue({ status: 2, stdout: "", stderr: "壊れた入力\n" });

    expect(() => checkStep(step(), "#!/bin/sh")).toThrow(/実行に失敗しました: 壊れた入力/);
  });

  it("標準エラーが空なら終了コードと signal を添えて落とす", () => {
    spawnSyncMock.mockReturnValue({ status: 2, stdout: "", stderr: "", signal: null });

    expect(() => checkStep(step(), "#!/bin/sh")).toThrow(/exit 2 signal null/);
  });
});

describe("remapFindings", () => {
  // ----- 正常系 -----
  it("shebang の 1 行と本文の開始位置を差し引いて写し戻す", () => {
    expect(remapFindings(step(), "-:2:5: note: 指摘\n")).toEqual([
      "  .github/actions/setup/action.yml:6:13: note: 指摘",
    ]);
  });

  it("複数の指摘をすべて写し戻す", () => {
    const output = "-:2:1: note: 一件目\n-:3:1: note: 二件目\n";

    expect(remapFindings(step(), output)).toHaveLength(2);
  });

  // ----- 異常系 -----
  it("位置を持たない行を読み飛ばす", () => {
    expect(remapFindings(step(), "書式に合わない行\n")).toEqual([]);
  });

  it("出力が空なら空を返す", () => {
    expect(remapFindings(step(), "")).toEqual([]);
  });
});
