import { describe, expect, it } from "vitest";

import {
  findNodeOnlyImports,
  formatNodeOnlyImports,
  isNodeOnlySpecifier,
  runtimeImportsOf,
} from "./edge-imports";

function tree(files: Record<string, string>) {
  return {
    load: (path: string): string | null => files[path] ?? null,
    resolve: (_from: string, specifier: string): string | null =>
      specifier.startsWith("@/") ? `src/${specifier.slice(2)}.ts` : null,
  };
}

describe("isNodeOnlySpecifier", () => {
  // ----- 正常系 -----
  it("`node:` 接頭辞の綴りを Node.js 専用とみなす", () => {
    expect(isNodeOnlySpecifier("node:path")).toBe(true);
  });

  it("接頭辞の無い組み込み module 名を Node.js 専用とみなす", () => {
    expect(isNodeOnlySpecifier("fs")).toBe(true);
  });

  it("組み込み module の下位の綴りを Node.js 専用とみなす", () => {
    expect(isNodeOnlySpecifier("fs/promises")).toBe(true);
  });

  it("`dotenv` とその下位の綴りを Node.js 専用とみなす", () => {
    expect(isNodeOnlySpecifier("dotenv")).toBe(true);
    expect(isNodeOnlySpecifier("dotenv/config")).toBe(true);
  });

  it("`server-only` は Edge で動くので許す", () => {
    expect(isNodeOnlySpecifier("server-only")).toBe(false);
  });

  it("別名・相対・外部パッケージの綴りは許す", () => {
    expect(isNodeOnlySpecifier("@/model/session")).toBe(false);
    expect(isNodeOnlySpecifier("./path")).toBe(false);
    expect(isNodeOnlySpecifier("next/server")).toBe(false);
  });
});

describe("runtimeImportsOf", () => {
  // ----- 正常系 -----
  it("静的な import・副作用だけの import・re-export・動的な import を出てきた順に挙げる", () => {
    const source = [
      'import a from "a";',
      'import "b";',
      'import * as c from "c";',
      'import d, { type D } from "d";',
      'import { e, type E } from "e";',
      'import {} from "f";',
      'export * from "g";',
      'export * as h from "h";',
      'export { i, type I } from "i";',
      "export const j = () => import(`j`);",
    ].join("\n");

    expect(runtimeImportsOf("src/a.ts", source)).toEqual([
      "a",
      "b",
      "c",
      "d",
      "e",
      "f",
      "g",
      "h",
      "i",
      "j",
    ]);
  });

  it("TSX のソースも読む", () => {
    const source = 'import a from "a";\n\nexport const b = <div />;\n';

    expect(runtimeImportsOf("src/a.tsx", source)).toEqual(["a"]);
  });

  // ----- 異常系 -----
  it("型だけの import / export は実行時に消えるので挙げない", () => {
    const source = [
      'import type { A } from "a";',
      'import { type B, type C } from "b";',
      'export type { D } from "d";',
      'export { type E } from "e";',
    ].join("\n");

    expect(runtimeImportsOf("src/a.ts", source)).toEqual([]);
  });

  it("引き先を持たない文と、綴りが文字列でない引き先は挙げない", () => {
    const source = [
      "import a from bad;",
      "export * from bad;",
      "export { a };",
      "const name = 'x';",
      "export const b = () => import(name);",
      "export const c = () => import();",
      "export const d = () => String(name);",
    ].join("\n");

    expect(runtimeImportsOf("src/a.ts", source)).toEqual([]);
  });
});

describe("findNodeOnlyImports", () => {
  // ----- 正常系 -----
  it("辿れる module が Node.js 専用の入口を引かなければ何も挙げない", () => {
    const { load, resolve } = tree({
      "src/proxy.ts": [
        'import { a } from "@/a";',
        'import "server-only";',
        'import { NextResponse } from "next/server";',
      ].join("\n"),
      "src/a.ts": 'import type { Stats } from "node:fs";\nexport const a = 1;\n',
    });

    expect(findNodeOnlyImports("src/proxy.ts", load, resolve)).toEqual([]);
  });

  it("循環する import を 1 度ずつ辿って止まる", () => {
    const { load, resolve } = tree({
      "src/proxy.ts": 'import { a } from "@/a";\n',
      "src/a.ts": 'import { b } from "@/b";\n',
      "src/b.ts": 'import { a } from "@/a";\nimport { proxy } from "@/proxy";\n',
    });

    expect(findNodeOnlyImports("src/proxy.ts", load, resolve)).toEqual([]);
  });

  // ----- 異常系 -----
  it("推移的に届いた module の違反を、入口からの経路つきで挙げる", () => {
    const { load, resolve } = tree({
      "src/proxy.ts": 'import { a } from "@/a";\n',
      "src/a.ts": 'import { b } from "@/b";\n',
      "src/b.ts": 'import { config } from "dotenv";\nimport path from "path";\n',
    });

    expect(findNodeOnlyImports("src/proxy.ts", load, resolve)).toEqual([
      { chain: ["src/proxy.ts", "src/a.ts", "src/b.ts"], specifier: "dotenv" },
      { chain: ["src/proxy.ts", "src/a.ts", "src/b.ts"], specifier: "path" },
    ]);
  });

  it("入口自身の違反を挙げる", () => {
    const { load, resolve } = tree({ "src/proxy.ts": 'import "node:crypto";\n' });

    expect(findNodeOnlyImports("src/proxy.ts", load, resolve)).toEqual([
      { chain: ["src/proxy.ts"], specifier: "node:crypto" },
    ]);
  });

  it("読めない module は辿らずに飛ばす", () => {
    const { load, resolve } = tree({ "src/proxy.ts": 'import { gone } from "@/gone";\n' });

    expect(findNodeOnlyImports("src/proxy.ts", load, resolve)).toEqual([]);
  });
});

describe("formatNodeOnlyImports", () => {
  // ----- 正常系 -----
  it("違反が無ければ空文字列を返す", () => {
    expect(formatNodeOnlyImports([])).toBe("");
  });

  // ----- 異常系 -----
  it("違反を経路つきで 1 行ずつ、並べ替えて返す", () => {
    expect(
      formatNodeOnlyImports([
        { chain: ["src/proxy.ts", "src/b.ts"], specifier: "node:fs" },
        { chain: ["src/proxy.ts", "src/a.ts"], specifier: "dotenv" },
      ]),
    ).toBe(
      "src/proxy.ts -> src/a.ts: dotenv を引いています\nsrc/proxy.ts -> src/b.ts: node:fs を引いています",
    );
  });
});
