import { describe, expect, it } from "vitest";

import { findMissingFrames, formatMissingFrames } from "./tsdoc-frame";

const FILE = "src/features/a/thing.ts";

describe("findMissingFrames", () => {
  // ----- 正常系 -----
  it("要約と `@param` を持つ関数を、欠けとして数えない", () => {
    const source = [
      "/**",
      " * 足す。",
      " *",
      " * @param value - 足す数",
      " */",
      "export function add(value: number): number {",
      "  return value + 1;",
      "}",
    ].join("\n");

    expect(findMissingFrames(FILE, source)).toEqual([]);
  });

  it("引数を持たない関数に `@param` を求めない", () => {
    expect(
      findMissingFrames(FILE, ["/** いまを返す。 */", "function now() {}"].join("\n")),
    ).toEqual([]);
  });

  it("変数へ入れた関数も対象にする", () => {
    expect(findMissingFrames(FILE, "/** 足す。 */\nconst add = () => 1;")).toEqual([]);
  });

  it("多重定義は先頭の宣言だけを見る", () => {
    const source = [
      "/** 引く。 */",
      "export function take(value: number): number;",
      "export function take(value: string): string;",
      "export function take(value: unknown): unknown {",
      "  return value;",
      "}",
    ].join("\n");

    expect(findMissingFrames(FILE, source)).toEqual([
      { file: FILE, line: 2, missing: "param", name: "take" },
    ]);
  });

  it("分割代入で受ける引数に `@param` を求めない", () => {
    // 読み手に見える名前が無く、各メンバーの doc は型の側が持つ。
    const source = [
      "/** 描く。 */",
      "export function View({ id }: ViewProps) {",
      "  return id;",
      "}",
    ].join("\n");

    expect(findMissingFrames(FILE, source)).toEqual([]);
  });

  it("object literal のメソッドは、型の側が doc を持つので対象にしない", () => {
    const source = ["const breaker = {", "  record(ok: boolean): void {},", "};"].join("\n");

    expect(findMissingFrames(FILE, source)).toEqual([]);
  });

  it("`implements` を持つクラスのメソッドも対象にしない", () => {
    const source = ["class A implements B {", "  run(value: number): void {}", "}"].join("\n");

    expect(findMissingFrames(FILE, source)).toEqual([]);
  });

  it("式で書いたクラスでも、`implements` があれば対象にしない", () => {
    const source = ["const A = class implements B {", "  run(value: number): void {}", "};"].join(
      "\n",
    );

    expect(findMissingFrames(FILE, source)).toEqual([]);
  });

  it("framework が名前で呼ぶファイルは走査しない", () => {
    const source = "export default function Page() {}";

    expect(findMissingFrames("src/app/shop/page.tsx", source)).toEqual([]);
    expect(findMissingFrames("src/proxy.ts", source)).toEqual([]);
  });

  it("テストと story と生成物は走査しない", () => {
    const source = "function helper() {}";

    expect(findMissingFrames("src/features/a/a.test.ts", source)).toEqual([]);
    expect(findMissingFrames("src/features/a/a.stories.tsx", source)).toEqual([]);
    expect(findMissingFrames("src/adapters/gen/api.ts", source)).toEqual([]);
  });

  // ----- 異常系 -----
  it("要約を持たない関数を、行とともに返す", () => {
    expect(findMissingFrames(FILE, "\nfunction bare() {}")).toEqual([
      { file: FILE, line: 2, missing: "doc", name: "bare" },
    ]);
  });

  it("名前を持つ引数があるのに `@param` を欠く関数を返す", () => {
    const source = ["/** 足す。 */", "function add(value: number) {", "  return value;", "}"].join(
      "\n",
    );

    expect(findMissingFrames(FILE, source)).toEqual([
      { file: FILE, line: 2, missing: "param", name: "add" },
    ]);
  });

  it("`implements` を持たないクラスのメソッドは対象にする", () => {
    expect(findMissingFrames(FILE, "class A {\n  run(): void {}\n}")).toEqual([
      { file: FILE, line: 2, missing: "doc", name: "run" },
    ]);
  });

  it("関数でない変数を、関数として数えない", () => {
    expect(findMissingFrames(FILE, "const value = 1;")).toEqual([]);
  });
});

describe("formatMissingFrames", () => {
  // ----- 正常系 -----
  it("欠けの種別を添えて 1 行 1 件で組む", () => {
    expect(
      formatMissingFrames([
        { file: FILE, line: 2, missing: "doc", name: "bare" },
        { file: FILE, line: 9, missing: "param", name: "add" },
      ]),
    ).toBe(`${FILE}:2 bare — 要約が無い\n${FILE}:9 add — \`@param\` が無い`);
  });

  // ----- 異常系 -----
  it("0 件なら空文字を返す", () => {
    expect(formatMissingFrames([])).toBe("");
  });
});
