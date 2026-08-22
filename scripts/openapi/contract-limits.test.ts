import { describe, expect, it } from "vitest";

import { collectContractLimits, renderContractLimits } from "./contract-limits";

const HEADER = ["/**", " * OpenAPI spec version: 2.2.0+abc1234", " */", ""].join("\n");

describe("collectContractLimits", () => {
  // ----- 正常系 -----
  it("数値の宣言を宣言された順で拾う", () => {
    expect(collectContractLimits("export const aMax = 200;\nexport const bMax = 99;")).toEqual([
      { name: "aMax", literal: "200" },
      { name: "bMax", literal: "99" },
    ]);
  });

  it("正規表現と文字列の宣言も拾う", () => {
    expect(
      collectContractLimits('export const aRegExp = /^\\d{4}$/;\nexport const bDefault = "asc";'),
    ).toEqual([
      { name: "aRegExp", literal: "/^\\d{4}$/" },
      { name: "bDefault", literal: '"asc"' },
    ]);
  });

  it("new RegExp や テンプレート literal も、括弧を含んでいても拾う", () => {
    // 生成器は制約をいろいろな形で出す。受ける形を列挙すると、形が変わるたびに黙って落ちる。
    expect(
      collectContractLimits(
        'export const aRegExp = new RegExp("^(a|b)$");\nexport const bDefault = `all`;',
      ),
    ).toEqual([
      { name: "aRegExp", literal: 'new RegExp("^(a|b)$")' },
      { name: "bDefault", literal: "`all`" },
    ]);
  });

  it("複数行にわたるスキーマの宣言は拾わない", () => {
    expect(
      collectContractLimits("export const aSchema = zod.object({\n  a: zod.string(),\n});"),
    ).toEqual([]);
  });

  it("整形で折り返された宣言も拾う", () => {
    // 生成器の出力は整形の前後で形が変わる。どちらでも同じ結果になる必要がある。
    expect(collectContractLimits('export const aRegExp = new RegExp(\n  "^(a|b)$",\n);')).toEqual([
      { name: "aRegExp", literal: 'new RegExp("^(a|b)$",)' },
    ]);
  });

  it("`;` で閉じないスキーマの後ろにある定数も拾う", () => {
    // 生の出力ではスキーマが `})` で終わり `;` を持たない。最短一致だと次の宣言を飲み込む。
    expect(
      collectContractLimits(
        "export const aSchema = zod.object({\n  a: zod.string(),\n})\n\nexport const bMax = 100;",
      ),
    ).toEqual([{ name: "bMax", literal: "100" }]);
  });

  // ----- 異常系 -----
  it("zod の呼び出しを含む宣言は拾わない", () => {
    // 拾うと、切り出した module 自身が zod を引くことになり、切り出した意味が消える。
    expect(collectContractLimits("export const aSchema = zod.string().max(200);")).toEqual([]);
  });

  it("export されていない宣言は拾わない", () => {
    expect(collectContractLimits("const aMax = 200;")).toEqual([]);
  });

  it("定数が 1 つも無ければ空を返す", () => {
    expect(collectContractLimits("")).toEqual([]);
  });
});

describe("renderContractLimits", () => {
  // ----- 正常系 -----
  it("契約の版を書き写す", () => {
    expect(renderContractLimits(HEADER, [{ name: "aMax", literal: "1" }])).toContain(
      "OpenAPI spec version: 2.2.0+abc1234",
    );
  });

  it("出所を orval ではなくこの手順として名乗る", () => {
    // 再生成しても orval からは現れないファイルなので、orval の出力を名乗らせない。
    expect(renderContractLimits(HEADER, [{ name: "aMax", literal: "1" }])).toContain(
      "scripts/openapi/extract-limits.ts",
    );
  });

  it("定数をそのままの綴りで並べる", () => {
    expect(renderContractLimits(HEADER, [{ name: "aMax", literal: "200" }])).toContain(
      "export const aMax = 200;",
    );
  });

  // ----- 異常系 -----
  it("版が読めないときも突合が読める行を残す", () => {
    expect(renderContractLimits("/** 版なし */", [{ name: "aMax", literal: "1" }])).toContain(
      "OpenAPI spec version: unknown",
    );
  });

  it("定数が 1 つも無ければ組み立てない", () => {
    // ヘッダだけのファイルが残ると、抽出が壊れているのか契約に無いのかを読む人が判じられない。
    expect(renderContractLimits(HEADER, [])).toBeNull();
  });
});
