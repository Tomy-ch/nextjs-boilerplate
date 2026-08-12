import { describe, expect, it } from "vitest";

import {
  checkFile,
  collectTestableExports,
  collectTopLevelDescribes,
  type ExportedSymbol,
  formatViolations,
  resolveTestFile,
  type Violation,
} from "./one-to-one";

/** 呼べる export の名前を並べて `isCallable` を作る。 */
const callableOf =
  (...names: string[]) =>
  (name: string): boolean =>
    names.includes(name);

/** `checkFile` の入力を、既定値付きで組み立てる。 */
const symbol = (name: string, testable = true, line = 1): ExportedSymbol => ({
  name,
  line,
  testable,
});

describe("collectTopLevelDescribes", () => {
  // ----- 正常系 -----
  it("最上位の describe を宣言順に、名前と行番号つきで返す", () => {
    const source = ['describe("first", () => {});', "", 'describe("second", () => {});'].join("\n");

    expect(collectTopLevelDescribes(source, "sample.test.ts")).toEqual([
      { name: "first", line: 1 },
      { name: "second", line: 3 },
    ]);
  });

  it("入れ子の describe へは降りない", () => {
    const source = ['describe("outer", () => {', '  describe("inner", () => {});', "});"].join(
      "\n",
    );

    expect(collectTopLevelDescribes(source, "sample.test.ts")).toEqual([
      { name: "outer", line: 1 },
    ]);
  });

  it("describe.only / describe.skip も最上位として拾う", () => {
    const source = 'describe.only("only", () => {});\ndescribe.skip("skip", () => {});';

    expect(collectTopLevelDescribes(source, "sample.test.ts")).toEqual([
      { name: "only", line: 1 },
      { name: "skip", line: 2 },
    ]);
  });

  it("ブロックで囲まれた describe も最上位として拾う", () => {
    const source = ["{", '  describe("wrapped", () => {});', "}"].join("\n");

    expect(collectTopLevelDescribes(source, "sample.test.ts")).toEqual([
      { name: "wrapped", line: 2 },
    ]);
  });

  it("tsx でも describe を拾う", () => {
    const source = 'describe("Button", () => {\n  it("描画する", () => {});\n});';

    expect(collectTopLevelDescribes(source, "button.test.tsx")).toEqual([
      { name: "Button", line: 1 },
    ]);
  });

  // ----- 異常系 -----
  it("タイトルがリテラル文字列でない describe は拾わず、内側の describe を最上位として扱う", () => {
    const source = ["describe(name, () => {", '  describe("inner", () => {});', "});"].join("\n");

    expect(collectTopLevelDescribes(source, "sample.test.ts")).toEqual([
      { name: "inner", line: 2 },
    ]);
  });

  it("引数の無い describe は拾わない", () => {
    expect(collectTopLevelDescribes("describe();", "sample.test.ts")).toEqual([]);
  });

  it("describe を持たないファイルでは空を返す", () => {
    expect(collectTopLevelDescribes('it("単独のケース", () => {});', "sample.test.ts")).toEqual([]);
  });
});

describe("collectTestableExports", () => {
  // ----- 正常系 -----
  it("export した関数宣言を、呼べる対象として返す", () => {
    const source = "export function resolve(): void {}";

    expect(collectTestableExports(source, "sample.ts", callableOf("resolve"))).toEqual([
      { name: "resolve", line: 1, testable: true },
    ]);
  });

  it("export したクラス宣言を、呼べる対象として返す", () => {
    const source = "export class Loader {}";

    expect(collectTestableExports(source, "sample.ts", callableOf("Loader"))).toEqual([
      { name: "Loader", line: 1, testable: true },
    ]);
  });

  it("1 つの変数宣言文にある複数の export を、それぞれ返す", () => {
    const source = "export const first = () => {},\n  second = () => {};";

    expect(collectTestableExports(source, "sample.ts", callableOf("first", "second"))).toEqual([
      { name: "first", line: 1, testable: true },
      { name: "second", line: 2, testable: true },
    ]);
  });

  it("末尾でまとめて出す export 宣言を、公開される別名の側で返す", () => {
    const source = "const internal = () => {};\nexport { internal as published };";

    expect(collectTestableExports(source, "sample.ts", callableOf("published"))).toEqual([
      { name: "published", line: 2, testable: true },
    ]);
  });

  it("default export した関数宣言は、宣言名で返しつつ呼べるかは default で引く", () => {
    const source = "export default function RootLayout(): void {}";

    expect(collectTestableExports(source, "layout.tsx", callableOf("default"))).toEqual([
      { name: "RootLayout", line: 1, testable: true },
    ]);
  });

  it("default export したクラス宣言も、宣言名で返しつつ呼べるかは default で引く", () => {
    const source = "export default class Loader {}";

    expect(collectTestableExports(source, "loader.ts", callableOf("default"))).toEqual([
      { name: "Loader", line: 1, testable: true },
    ]);
  });

  it("`export default <識別子>` は、参照している名前で返しつつ呼べるかは default で引く", () => {
    const source = "const handle = () => {};\nexport default handle;";

    expect(collectTestableExports(source, "handler.ts", callableOf("default"))).toEqual([
      { name: "handle", line: 2, testable: true },
    ]);
  });

  it("`export default <識別子>` が名前つき export と重なっても二重に数えない", () => {
    const source = "export const handle = () => {};\nexport default handle;";

    expect(collectTestableExports(source, "handler.ts", callableOf("handle"))).toEqual([
      { name: "handle", line: 1, testable: true },
    ]);
  });

  it("呼べない export は testable が false になる", () => {
    const source = "export const LIMIT = 10;";

    expect(collectTestableExports(source, "sample.ts", callableOf())).toEqual([
      { name: "LIMIT", line: 1, testable: false },
    ]);
  });

  // ----- 異常系 -----
  it("export していない宣言は返さない", () => {
    const source = "function hidden(): void {}\nconst value = 1;\nclass Local {}";

    expect(
      collectTestableExports(source, "sample.ts", callableOf("hidden", "value", "Local")),
    ).toEqual([]);
  });

  it("型だけの export は返さない", () => {
    const source = [
      "type Local = string;",
      "export type { Local };",
      "export type Alias = number;",
    ].join("\n");

    expect(collectTestableExports(source, "sample.ts", callableOf())).toEqual([]);
  });

  it("個別に型指定された export 要素は返さない", () => {
    const source = [
      "type Local = string;",
      "const value = () => {};",
      "export { type Local, value };",
    ].join("\n");

    expect(collectTestableExports(source, "sample.ts", callableOf("value"))).toEqual([
      { name: "value", line: 3, testable: true },
    ]);
  });

  it("分割代入で export された宣言は名前を取り出せないため返さない", () => {
    const source = "export const { alpha, beta } = source;";

    expect(collectTestableExports(source, "sample.ts", callableOf("alpha", "beta"))).toEqual([]);
  });

  it("`export = <識別子>` は default export ではないため返さない", () => {
    const source = "const handle = () => {};\nexport = handle;";

    expect(collectTestableExports(source, "handler.ts", callableOf("default", "handle"))).toEqual(
      [],
    );
  });

  it("`export default <式>` は名前を持たないため返さない", () => {
    const source = "export default () => {};";

    expect(collectTestableExports(source, "handler.ts", callableOf("default"))).toEqual([]);
  });

  it("再 export（`export * from`）は名前を持たないため返さない", () => {
    const source = 'export * from "./other";';

    expect(collectTestableExports(source, "sample.ts", callableOf())).toEqual([]);
  });

  it("名前空間つきの再 export（`export * as ns from`）は返さない", () => {
    const source = 'export * as helpers from "./other";';

    expect(collectTestableExports(source, "sample.ts", callableOf("helpers"))).toEqual([]);
  });
});

describe("checkFile", () => {
  // ----- 正常系 -----
  it("呼べる export がすべて対応する describe を持てば違反を返さない", () => {
    const violations = checkFile({
      file: "sample.ts",
      testFile: "sample.test.ts",
      exports: [symbol("resolve"), symbol("LIMIT", false)],
      describes: [{ name: "resolve", line: 3 }],
    });

    expect(violations).toEqual([]);
  });

  it("呼べる export が無ければ、テストファイルが無くても違反を返さない", () => {
    const violations = checkFile({
      file: "types.ts",
      testFile: null,
      exports: [symbol("LIMIT", false)],
      describes: [],
    });

    expect(violations).toEqual([]);
  });

  it("export を持たないモジュールでは、モジュール名の describe を違反にしない", () => {
    const violations = checkFile({
      file: "validate-environment.server.ts",
      testFile: "validate-environment.server.test.ts",
      exports: [],
      describes: [{ name: "validate-environment.server", line: 7 }],
    });

    expect(violations).toEqual([]);
  });

  it("呼べない export に対応する describe は違反にしない", () => {
    const violations = checkFile({
      file: "sample.ts",
      testFile: "sample.test.ts",
      exports: [symbol("resolve"), symbol("SCHEMA", false)],
      describes: [
        { name: "resolve", line: 3 },
        { name: "SCHEMA", line: 9 },
      ],
    });

    expect(violations).toEqual([]);
  });

  // ----- 異常系 -----
  it("テストファイルが無ければ、呼べる export ごとに missing-test-file を返す", () => {
    const violations = checkFile({
      file: "sample.ts",
      testFile: null,
      exports: [symbol("first", true, 4), symbol("second", true, 8)],
      describes: [],
    });

    expect(violations).toEqual<Violation[]>([
      {
        kind: "missing-test-file",
        file: "sample.ts",
        line: 4,
        message: "first に対応するテストファイルがありません",
      },
      {
        kind: "missing-test-file",
        file: "sample.ts",
        line: 8,
        message: "second に対応するテストファイルがありません",
      },
    ]);
  });

  it("describe を持たない export に missing-describe を返す", () => {
    const violations = checkFile({
      file: "sample.ts",
      testFile: "sample.test.ts",
      exports: [symbol("resolve", true, 4)],
      describes: [],
    });

    expect(violations).toEqual<Violation[]>([
      {
        kind: "missing-describe",
        file: "sample.ts",
        line: 4,
        message: 'resolve に対応する describe("resolve") が sample.test.ts にありません',
      },
    ]);
  });

  it("同じ export に describe が 2 つ以上あれば duplicate-describe を返す", () => {
    const violations = checkFile({
      file: "sample.ts",
      testFile: "sample.test.ts",
      exports: [symbol("resolve")],
      describes: [
        { name: "resolve", line: 3 },
        { name: "resolve", line: 20 },
      ],
    });

    expect(violations).toEqual<Violation[]>([
      {
        kind: "duplicate-describe",
        file: "sample.test.ts",
        line: 20,
        message: 'describe("resolve") が 2 つあります。1 つにまとめてください',
      },
    ]);
  });

  it("どの export にも対応しない最上位 describe に unknown-describe を返す", () => {
    const violations = checkFile({
      file: "sample.ts",
      testFile: "sample.test.ts",
      exports: [symbol("resolve")],
      describes: [
        { name: "resolve", line: 3 },
        { name: "正常系", line: 30 },
      ],
    });

    expect(violations).toEqual<Violation[]>([
      {
        kind: "unknown-describe",
        file: "sample.test.ts",
        line: 30,
        message:
          'describe("正常系") はどの export にも対応しません。最上位の describe は export 名にし、観点ごとの束ねは `// ----- 正常系 -----` のコメント区切りで行ってください',
      },
    ]);
  });

  it("呼べる export が無くても、どの export にも対応しない describe は unknown-describe を返す", () => {
    const violations = checkFile({
      file: "error-kind.ts",
      testFile: "error-kind.test.ts",
      exports: [symbol("errorKinds", false)],
      describes: [{ name: "正常系", line: 5 }],
    });

    expect(violations).toEqual([
      {
        kind: "unknown-describe",
        file: "error-kind.test.ts",
        line: 5,
        message:
          'describe("正常系") はどの export にも対応しません。最上位の describe は export 名にし、観点ごとの束ねは `// ----- 正常系 -----` のコメント区切りで行ってください',
      },
    ]);
  });
});

describe("formatViolations", () => {
  // ----- 正常系 -----
  it("ファイル・行・種別・本文を 1 行にまとめ、行ごとに整列して返す", () => {
    const violations: Violation[] = [
      { kind: "missing-describe", file: "b.ts", line: 2, message: "後" },
      { kind: "unknown-describe", file: "a.test.ts", line: 1, message: "先" },
    ];

    expect(formatViolations(violations)).toBe(
      ["a.test.ts:1: [unknown-describe] 先", "b.ts:2: [missing-describe] 後"].join("\n"),
    );
  });

  it("同じ行が並んでも順序を壊さない", () => {
    const same: Violation = { kind: "missing-describe", file: "a.ts", line: 1, message: "同" };

    expect(formatViolations([same, same]).split("\n")).toHaveLength(2);
  });

  it("違反が無ければ空文字を返す", () => {
    expect(formatViolations([])).toBe("");
  });
});

describe("resolveTestFile", () => {
  // ----- 正常系 -----
  it("tsx のソースには tsx のテストを対応させる", () => {
    expect(resolveTestFile("src/ui/button.tsx", (path) => path === "src/ui/button.test.tsx")).toBe(
      "src/ui/button.test.tsx",
    );
  });

  it("ts のソースには同じ拡張子のテストを優先して対応させる", () => {
    expect(resolveTestFile("src/lib/total.ts", () => true)).toBe("src/lib/total.test.ts");
  });

  it("ts のソースでも tsx のテストを受け付ける", () => {
    expect(resolveTestFile("src/capabilities/use-x.ts", (path) => path.endsWith(".test.tsx"))).toBe(
      "src/capabilities/use-x.test.tsx",
    );
  });

  it("tsx のソースに ts のテストは対応させない", () => {
    expect(resolveTestFile("src/ui/button.tsx", (path) => path.endsWith(".test.ts"))).toBeNull();
  });

  it("どちらも無ければ null を返す", () => {
    expect(resolveTestFile("src/lib/total.ts", () => false)).toBeNull();
  });
});
