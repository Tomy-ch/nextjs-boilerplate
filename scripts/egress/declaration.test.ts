import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  DECLARATION_FILE,
  endpointsFor,
  orphanKeys,
  parseDeclaration,
  readDeclaration,
} from "./declaration";

const YAML = [
  "baseline:",
  "  - github.com:443",
  "  - api.github.com:443",
  "workflows:",
  "  vrt:",
  "    - mcr.microsoft.com:443",
  "audit:",
  "  notify: 実行の記録がまだ無い",
].join("\n");

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "egress-declaration-"));
});

afterEach(() => {
  rmSync(root, { force: true, recursive: true });
});

describe("DECLARATION_FILE", () => {
  // ----- 正常系 -----
  it("宣言の位置をリポジトリ相対で示す", () => {
    expect(DECLARATION_FILE).toBe(".github/egress.yaml");
  });
});

describe("parseDeclaration", () => {
  // ----- 正常系 -----
  it("土台と固有分と監査のままの宣言を読む", () => {
    expect(parseDeclaration(YAML)).toEqual({
      baseline: ["github.com:443", "api.github.com:443"],
      workflows: { vrt: ["mcr.microsoft.com:443"] },
      audit: { notify: "実行の記録がまだ無い" },
    });
  });

  it("固有分と監査は省ける", () => {
    expect(parseDeclaration("baseline:\n  - github.com:443")).toEqual({
      baseline: ["github.com:443"],
      workflows: {},
      audit: {},
    });
  });

  it("ワイルドカードの宛先を受け取る", () => {
    expect(parseDeclaration("baseline:\n  - '*.blob.core.windows.net:443'").baseline).toEqual([
      "*.blob.core.windows.net:443",
    ]);
  });

  // ----- 異常系 -----
  it("土台が空なら落ちる", () => {
    expect(() => parseDeclaration("baseline: []")).toThrow();
  });

  it("土台が無ければ落ちる", () => {
    expect(() => parseDeclaration("workflows: {}")).toThrow();
  });

  it("port を省いた宛先は落ちる", () => {
    expect(() => parseDeclaration("baseline:\n  - github.com")).toThrow(/host:port/);
  });

  it("宛先の途中にワイルドカードがあれば落ちる", () => {
    expect(() => parseDeclaration("baseline:\n  - 'api.*.com:443'")).toThrow(/host:port/);
  });

  it("固有分が空配列なら落ちる", () => {
    expect(() =>
      parseDeclaration("baseline:\n  - github.com:443\nworkflows:\n  vrt: []"),
    ).toThrow();
  });

  it("監査のままにする理由が空なら落ちる", () => {
    expect(() =>
      parseDeclaration("baseline:\n  - github.com:443\naudit:\n  notify: '   '"),
    ).toThrow();
  });
});

describe("readDeclaration", () => {
  // ----- 正常系 -----
  it("ファイルから読む", () => {
    const file = join(root, "egress.yaml");

    writeFileSync(file, YAML);

    expect(readDeclaration(file).baseline).toEqual(["github.com:443", "api.github.com:443"]);
  });

  // ----- 異常系 -----
  it("読めないファイルなら落ちる", () => {
    expect(() => readDeclaration(join(root, "不在.yaml"))).toThrow();
  });
});

describe("endpointsFor", () => {
  const declaration = parseDeclaration(YAML);

  // ----- 正常系 -----
  it("土台の後ろに固有分を並べる", () => {
    expect(endpointsFor(declaration, "vrt")).toEqual([
      "github.com:443",
      "api.github.com:443",
      "mcr.microsoft.com:443",
    ]);
  });

  it("固有分の宣言が無ければ土台だけを返す", () => {
    expect(endpointsFor(declaration, "lint")).toEqual(["github.com:443", "api.github.com:443"]);
  });

  // ----- 異常系 -----
  it("監査のままと宣言された workflow には null を返す", () => {
    expect(endpointsFor(declaration, "notify")).toBeNull();
  });
});

describe("orphanKeys", () => {
  const declaration = parseDeclaration(YAML);

  // ----- 正常系 -----
  it("対応する workflow が揃っていれば空を返す", () => {
    expect(orphanKeys(declaration, ["vrt", "notify", "lint"])).toEqual([]);
  });

  // ----- 異常系 -----
  it("固有分も監査のままも、対応が無ければ挙げる", () => {
    expect(orphanKeys(declaration, ["lint"])).toEqual(["notify", "vrt"]);
  });
});
