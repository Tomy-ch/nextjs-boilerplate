import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ZodError } from "zod";

import {
  allowedIps,
  DECLARATION_FILE,
  domainsFor,
  orphanKeys,
  orphanSudo,
  parseDeclaration,
  readDeclaration,
  sudoFor,
} from "./declaration";

const YAML = [
  "baseline:",
  "  - github.com",
  "  - api.github.com",
  "ips:",
  "  '127.0.0.100': ローカルの DNS 転送役",
  "workflows:",
  "  vrt:",
  "    - mcr.microsoft.com",
  "audit:",
  "  notify: 実行の記録がまだ無い",
  "sudo:",
  "  vrt:",
  "    capture: ホストのパスをマウントする",
].join("\n");

let root: string;

/** 宣言が拒まれた理由。通ってしまったら、それ自体を失敗にする。 */
function rejection(text: string): ZodError["issues"] {
  try {
    parseDeclaration(text);
  } catch (error) {
    if (error instanceof ZodError) return error.issues;
    throw error;
  }

  throw new Error("宣言が拒まれませんでした");
}

const BASE = "baseline:\n  - github.com\n";

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
  it("土台と IP と固有分と監査のままと sudo の例外を読む", () => {
    expect(parseDeclaration(YAML)).toEqual({
      baseline: ["github.com", "api.github.com"],
      ips: { "127.0.0.100": "ローカルの DNS 転送役" },
      workflows: { vrt: ["mcr.microsoft.com"] },
      audit: { notify: "実行の記録がまだ無い" },
      sudo: { vrt: { capture: "ホストのパスをマウントする" } },
    });
  });

  it("IP と固有分と監査と sudo の例外は省ける", () => {
    expect(parseDeclaration("baseline:\n  - github.com")).toEqual({
      baseline: ["github.com"],
      ips: {},
      workflows: {},
      audit: {},
      sudo: {},
    });
  });

  it("キーだけが残った対応表を空として読む", () => {
    const text = "baseline:\n  - github.com\nips:\nworkflows:\naudit:\nsudo:";

    expect(parseDeclaration(text)).toEqual({
      baseline: ["github.com"],
      ips: {},
      workflows: {},
      audit: {},
      sudo: {},
    });
  });

  it("ワイルドカードの宛先を受け取る", () => {
    expect(parseDeclaration("baseline:\n  - '*.blob.core.windows.net'").baseline).toEqual([
      "*.blob.core.windows.net",
    ]);
  });

  it("境界のオクテットと接頭辞長を受け取る", () => {
    const edges = parseDeclaration(`${BASE}ips:\n  255.255.255.255/32: 理由\n  0.0.0.0/0: 理由`);

    expect(allowedIps(edges)).toEqual(["255.255.255.255/32", "0.0.0.0/0"]);
  });

  it("CIDR の IP を受け取る", () => {
    expect(parseDeclaration("baseline:\n  - github.com\nips:\n  10.0.0.0/8: 理由").ips).toEqual({
      "10.0.0.0/8": "理由",
    });
  });

  // ----- 異常系 -----
  it("空の文書は落ちる", () => {
    expect(rejection("")[0]).toMatchObject({
      path: [],
      message: "Invalid input: expected object, received null",
    });
  });

  it("null だけの文書は落ちる", () => {
    expect(rejection("~")[0]).toMatchObject({
      path: [],
      message: "Invalid input: expected object, received null",
    });
  });

  it("土台が空なら落ちる", () => {
    expect(rejection("baseline: []")[0]).toMatchObject({
      path: ["baseline"],
      message: "baseline は 1 件以上要ります",
    });
  });

  it("土台が無ければ落ちる", () => {
    expect(rejection("workflows: {}")[0]).toMatchObject({
      path: ["baseline"],
      message: "Invalid input: expected array, received undefined",
    });
  });

  it("port を付けた宛先は落ちる", () => {
    expect(rejection("baseline:\n  - github.com:443")[0]).toMatchObject({
      path: ["baseline", 0],
      message: "ドメイン名だけを書く必要があります（port は書けません）",
    });
  });

  it("固有分の宛先に port を付けても落ちる", () => {
    expect(rejection(`${BASE}workflows:\n  vrt:\n    - mcr.microsoft.com:443`)[0]).toMatchObject({
      path: ["workflows", "vrt", 0],
      message: "ドメイン名だけを書く必要があります（port は書けません）",
    });
  });

  it("宛先の途中にワイルドカードがあれば落ちる", () => {
    expect(rejection("baseline:\n  - 'api.*.com'")[0]).toMatchObject({
      path: ["baseline", 0],
      message: "ドメイン名だけを書く必要があります（port は書けません）",
    });
  });

  it("固有分が空配列なら落ちる", () => {
    expect(rejection(`${BASE}workflows:\n  vrt: []`)[0]).toMatchObject({
      path: ["workflows", "vrt"],
      message: "固有分は 1 件以上要ります",
    });
  });

  it("監査のままにする理由が空なら落ちる", () => {
    expect(rejection(`${BASE}audit:\n  notify: '   '`)[0]).toMatchObject({
      path: ["audit", "notify"],
      message: "理由を空にできません",
    });
  });

  it.each([
    "example.com",
    "999.1.1.1",
    "256.0.0.1",
    "01.2.3.4",
    "1.2.3",
    "10.0.0.0/33",
  ])("IPv4 のアドレスでも CIDR でもないキー %s は落ちる", (key) => {
    const [issue] = rejection(`${BASE}ips:\n  '${key}': 理由`);

    expect(issue?.path[0]).toBe("ips");
    expect(JSON.stringify(issue)).toContain("IPv4 のアドレスか CIDR である必要があります");
  });

  it("IP を許す理由が空なら落ちる", () => {
    expect(rejection(`${BASE}ips:\n  '1.2.3.4': ''`)[0]).toMatchObject({
      path: ["ips", "1.2.3.4"],
      message: "理由を空にできません",
    });
  });

  it("sudo を残す理由が空なら落ちる", () => {
    expect(rejection(`${BASE}sudo:\n  vrt:\n    capture: '  '`)[0]).toMatchObject({
      path: ["sudo", "vrt", "capture"],
      message: "理由を空にできません",
    });
  });

  it("sudo の例外が job を挟まずに理由を書いていれば落ちる", () => {
    expect(rejection(`${BASE}sudo:\n  vrt: ホストのパスをマウントする`)[0]).toMatchObject({
      path: ["sudo", "vrt"],
      message: "Invalid input: expected record, received string",
    });
  });
});

describe("readDeclaration", () => {
  // ----- 正常系 -----
  it("ファイルから読む", () => {
    const file = join(root, "egress.yaml");

    writeFileSync(file, YAML);

    expect(readDeclaration(file).baseline).toEqual(["github.com", "api.github.com"]);
  });

  // ----- 異常系 -----
  it("読めないファイルなら落ちる", () => {
    expect(() => readDeclaration(join(root, "不在.yaml"))).toThrow();
  });
});

describe("domainsFor", () => {
  const declaration = parseDeclaration(YAML);

  // ----- 正常系 -----
  it("土台の後ろに固有分を並べる", () => {
    expect(domainsFor(declaration, "vrt")).toEqual([
      "github.com",
      "api.github.com",
      "mcr.microsoft.com",
    ]);
  });

  it("固有分の宣言が無ければ土台だけを返す", () => {
    expect(domainsFor(declaration, "lint")).toEqual(["github.com", "api.github.com"]);
  });

  // ----- 異常系 -----
  it("監査のままと宣言された workflow には null を返す", () => {
    expect(domainsFor(declaration, "notify")).toBeNull();
  });

  it("固有分を持っていても監査のままと宣言されていれば null を返す", () => {
    const both = parseDeclaration(
      `${BASE}workflows:\n  vrt:\n    - a.example\naudit:\n  vrt: 理由`,
    );

    expect(domainsFor(both, "vrt")).toBeNull();
  });
});

describe("allowedIps", () => {
  // ----- 正常系 -----
  it("宣言した IP を並べる", () => {
    expect(allowedIps(parseDeclaration(YAML))).toEqual(["127.0.0.100"]);
  });

  // ----- 異常系 -----
  it("宣言が無ければ空を返す", () => {
    expect(allowedIps(parseDeclaration("baseline:\n  - github.com"))).toEqual([]);
  });
});

describe("sudoFor", () => {
  const declaration = parseDeclaration(YAML);

  // ----- 正常系 -----
  it("例外と宣言された job には true を返す", () => {
    expect(sudoFor(declaration, "vrt", "capture")).toBe(true);
  });

  // ----- 異常系 -----
  it("同じ workflow でも宣言に無い job には false を返す", () => {
    expect(sudoFor(declaration, "vrt", "scope")).toBe(false);
  });

  it("例外を 1 つも持たない workflow には false を返す", () => {
    expect(sudoFor(declaration, "lint", "capture")).toBe(false);
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

describe("orphanSudo", () => {
  const declaration = parseDeclaration(YAML);

  // ----- 正常系 -----
  it("宣言した job が見つかっていれば空を返す", () => {
    expect(orphanSudo(declaration, ["vrt/scope", "vrt/capture"])).toEqual([]);
  });

  // ----- 異常系 -----
  it("見つからない job が複数あれば workflow/job の順に並べる", () => {
    const many = parseDeclaration(
      `${BASE}sudo:\n  vrt:\n    shard: 理由\n    capture: 理由\n  a11y:\n    a11y: 理由`,
    );

    expect(orphanSudo(many, [])).toEqual(["a11y/a11y", "vrt/capture", "vrt/shard"]);
  });

  it("見つからない job を workflow/job の形で挙げる", () => {
    expect(orphanSudo(declaration, ["vrt/scope", "lint/capture"])).toEqual(["vrt/capture"]);
  });
});
