import { describe, expect, it } from "vitest";

import { collectFailures, type Failure, formatStoryIDs, formatTable, TABLE_LIMIT } from "./report";

/** 1 件分のテスト結果を組み立てる。 */
function test(options: {
  id?: string;
  status?: string;
  project?: string;
  message?: string;
}): unknown {
  return {
    projectName: options.project ?? "light",
    status: options.status ?? "unexpected",
    annotations: options.id === undefined ? [] : [{ type: "story", description: options.id }],
    results: options.message === undefined ? [] : [{ errors: [{ message: options.message }] }],
  };
}

/** spec を 1 つ持つレポートを組み立てる。 */
function reportOf(specs: unknown[], nested: unknown[] = []): string {
  return JSON.stringify({ suites: [{ specs, suites: nested }] });
}

const failure = (id: string, theme = "light"): Failure => ({
  id,
  title: "Action/Button / Default",
  theme,
  diffPixels: null,
});

describe("TABLE_LIMIT", () => {
  // ----- 正常系 -----
  it("一覧表に並べる上限を示す", () => {
    expect(TABLE_LIMIT).toBe(20);
  });
});

describe("collectFailures", () => {
  // ----- 正常系 -----
  it("落ちた story を id と見出しとテーマで取り出す", () => {
    const json = reportOf([
      { title: "Action/Button / Default", tests: [test({ id: "action-button--default" })] },
    ]);

    expect(collectFailures(json)).toEqual([
      {
        id: "action-button--default",
        title: "Action/Button / Default",
        theme: "light",
        diffPixels: null,
      },
    ]);
  });

  it("食い違った画素数をエラー本文から取り出す", () => {
    const json = reportOf([
      {
        title: "Action/Button / Default",
        tests: [test({ id: "a--x", message: "  908440 pixels (ratio 0.99) are different." })],
      },
    ]);

    expect(collectFailures(json)[0].diffPixels).toBe(908440);
  });

  it("入れ子の suite に居る spec も拾う", () => {
    const json = reportOf(
      [],
      [{ specs: [{ title: "A / B", tests: [test({ id: "a--x" })] }], suites: [] }],
    );

    expect(collectFailures(json).map((entry) => entry.id)).toEqual(["a--x"]);
  });

  it("id とテーマの順で並べる", () => {
    const json = reportOf([
      { title: "B", tests: [test({ id: "b--x" })] },
      {
        title: "A",
        tests: [test({ id: "a--x", project: "light" }), test({ id: "a--x", project: "dark" })],
      },
    ]);

    expect(collectFailures(json).map((entry) => `${entry.id}:${entry.theme}`)).toEqual([
      "a--x:dark",
      "a--x:light",
      "b--x:light",
    ]);
  });

  it("通ったテストを落ちた扱いにしない", () => {
    const json = reportOf([
      { title: "A", tests: [test({ id: "a--x", status: "expected" })] },
      { title: "B", tests: [test({ id: "b--x" })] },
    ]);

    expect(collectFailures(json).map((entry) => entry.id)).toEqual(["b--x"]);
  });

  it("見出しが読めなければ id を代わりに置く", () => {
    const json = reportOf([{ title: 42, tests: [test({ id: "a--x" })] }]);

    expect(collectFailures(json)[0].title).toBe("a--x");
  });

  // ----- 異常系 -----
  it("story の注記を持たないテストを対象にしない", () => {
    const json = reportOf([{ title: "A", tests: [test({})] }]);

    expect(collectFailures(json)).toEqual([]);
  });

  it("suites を持たないレポートを落とす", () => {
    expect(() => collectFailures(JSON.stringify({}))).toThrow(
      "JSON レポートに suites がありません",
    );
  });
});

describe("formatTable", () => {
  // ----- 正常系 -----
  it("件数と表を組み立てる", () => {
    const table = formatTable([{ ...failure("a--x"), diffPixels: 1234 }]);

    expect(table).toContain("1 件の story が基準画像と食い違いました。");
    expect(table).toContain("| Action/Button / Default | light | 1,234 px | `a--x` |");
  });

  it("画素数が取れなかった行を空欄にせず印で埋める", () => {
    expect(formatTable([failure("a--x")])).toContain("| — |");
  });

  it("上限を超えた分は件数だけを添える", () => {
    const failures = Array.from({ length: TABLE_LIMIT + 3 }, (_, index) => failure(`a--${index}`));

    const table = formatTable(failures);

    expect(table).toContain(`${TABLE_LIMIT + 3} 件の story が基準画像と食い違いました。`);
    expect(table).toContain("ほか 3 件");
  });

  // ----- 異常系 -----
  it("差分が無ければ表を出さない", () => {
    expect(formatTable([])).toBe("差分はありません。");
  });
});

describe("formatStoryIDs", () => {
  // ----- 正常系 -----
  it("テーマ違いを 1 件に畳んでカンマ区切りで並べる", () => {
    expect(formatStoryIDs([failure("b--x"), failure("a--x", "dark"), failure("a--x")])).toBe(
      "a--x,b--x",
    );
  });

  // ----- 異常系 -----
  it("差分が無ければ空文字を返す", () => {
    expect(formatStoryIDs([])).toBe("");
  });
});
