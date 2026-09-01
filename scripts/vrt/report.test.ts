import { describe, expect, it } from "vitest";

import {
  collectFailures,
  type Failure,
  formatStoryIDs,
  formatTable,
  hasBaselineFailure,
  TABLE_LIMIT,
} from "./report";

/** 1 件分のテスト結果を組み立てる。tag は spec が持つため、ここには入れない。 */
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

  it("テーマを読めなければ空にして報告を続ける", () => {
    const json = reportOf([
      { title: "A", tests: [{ ...(test({ id: "a--x" }) as object), projectName: 42 }] },
    ]);

    expect(collectFailures(json)[0].theme).toBe("");
  });

  // ----- 異常系 -----
  it("story の注記を持たないテストを対象にしない", () => {
    const json = reportOf([{ title: "A", tests: [test({})] }]);

    expect(collectFailures(json)).toEqual([]);
  });

  it("注記の説明が文字列でないテストを対象にしない", () => {
    const json = reportOf([
      {
        title: "A",
        tests: [{ status: "unexpected", annotations: [{ type: "story", description: 42 }] }],
      },
    ]);

    expect(collectFailures(json)).toEqual([]);
  });

  it("配列でない tests / annotations / results を空として扱う", () => {
    const json = reportOf([
      { title: "A", tests: "壊れている" },
      {
        title: "B",
        tests: [{ status: "unexpected", annotations: [{ type: "story", description: "b--x" }] }],
      },
    ]);

    expect(collectFailures(json)).toEqual([
      { id: "b--x", title: "B", theme: "", diffPixels: null },
    ]);
  });

  it("文字列でないエラー本文から画素数を読み取らない", () => {
    const json = reportOf([
      {
        title: "A",
        tests: [
          {
            ...(test({ id: "a--x" }) as object),
            results: [{ errors: [{ message: 42 }, { message: "差分の記述なし" }] }],
          },
        ],
      },
    ]);

    expect(collectFailures(json)[0].diffPixels).toBeNull();
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

  it("升目の区切りと改行を含む見出しが、表の行の形を壊さない", () => {
    const broken: Failure = {
      id: "x--y",
      title: "壊す | 行\n## 見出し",
      theme: "light",
      diffPixels: null,
    };

    const row = formatTable([broken]).split("\n").at(-1);

    expect(row).toBe("| 壊す \\| 行 ## 見出し | light | — | `x--y` |");
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

describe("hasBaselineFailure", () => {
  // ----- 正常系 -----
  it("1 対 1 対応の検査が落ちていれば true を返す", () => {
    const json = reportOf([{ title: "基準画像", tags: ["baselines"], tests: [test({})] }]);

    expect(hasBaselineFailure(json)).toBe(true);
  });

  it("宣言どおり `@` 付きで載っていても見つける", () => {
    const json = reportOf([{ title: "基準画像", tags: ["@baselines"], tests: [test({})] }]);

    expect(hasBaselineFailure(json)).toBe(true);
  });

  it("走らせなかった分を、落ちたと数えない", () => {
    // 撮り直しの最中や範囲を絞った実行では、この検査は skip になる
    // （`vrt/stories.spec.ts`）。落ちたと数えると、孤児が 1 件も無くても全数の撮り直しになる。
    const json = reportOf([
      { title: "基準画像", tags: ["baselines"], tests: [test({ status: "skipped" })] },
    ]);

    expect(hasBaselineFailure(json)).toBe(false);
  });

  // ----- 異常系 -----
  it("tag がどの spec にも無ければ、孤児なしと答えずに落とす", () => {
    const json = reportOf([{ title: "Button", tests: [test({ id: "a" })] }]);

    expect(() => hasBaselineFailure(json)).toThrow(/@baselines/);
  });

  it("tag が test の側にしか載っていないときも落とす", () => {
    const json = reportOf([
      { title: "基準画像", tests: [{ ...(test({}) as object), tags: ["baselines"] }] },
    ]);

    expect(() => hasBaselineFailure(json)).toThrow(/@baselines/);
  });

  it("story だけが食い違っているときは false を返す", () => {
    const json = reportOf([
      { title: "Button", tests: [test({ id: "a" })] },
      { title: "基準画像", tags: ["baselines"], tests: [test({ status: "expected" })] },
    ]);

    expect(hasBaselineFailure(json)).toBe(false);
  });

  it("1 対 1 対応の検査が通っていれば false を返す", () => {
    const json = reportOf([
      { title: "基準画像", tags: ["baselines"], tests: [test({ status: "expected" })] },
    ]);

    expect(hasBaselineFailure(json)).toBe(false);
  });

  it("入れ子の suite にあっても見つける", () => {
    const json = reportOf(
      [],
      [{ specs: [{ title: "基準画像", tags: ["baselines"], tests: [test({})] }] }],
    );

    expect(hasBaselineFailure(json)).toBe(true);
  });

  // ----- 異常系 -----
  it("suites が無いレポートを弾く", () => {
    expect(() => hasBaselineFailure("{}")).toThrow("JSON レポートに suites がありません");
  });
});
