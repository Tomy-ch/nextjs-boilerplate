import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { root } = await vi.hoisted(async () => {
  const { mkdtempSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join: joinPath } = await import("node:path");

  return { root: mkdtempSync(joinPath(tmpdir(), "setup-file-utils-")) };
});

vi.mock("./runtime.js", () => ({ ROOT_DIR: root }));

const {
  countOccurrences,
  listChildFiles,
  listFilesRecursive,
  readUtf8File,
  removeTarget,
  toAbsolutePath,
  toRelativePath,
  updateAbsoluteFile,
  updateFile,
} = await import("./file-utils");

/** ルート直下の相対パスへ親ごとファイルを置く。 */
function place(relativePath: string, content: string): string {
  const target = join(root, relativePath);
  mkdirSync(join(target, ".."), { recursive: true });
  writeFileSync(target, content);

  return target;
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  for (const entry of ["work", "tree", "children"]) {
    rmSync(join(root, entry), { force: true, recursive: true });
  }
});

describe("toAbsolutePath", () => {
  // ----- 正常系 -----
  it("ルートからの相対パスを絶対パスへ変える", () => {
    expect(toAbsolutePath("work/sample.txt")).toBe(join(root, "work", "sample.txt"));
  });
});

describe("toRelativePath", () => {
  // ----- 正常系 -----
  it("絶対パスをルートからの相対パスへ変える", () => {
    expect(toRelativePath(join(root, "work", "sample.txt"))).toBe(join("work", "sample.txt"));
  });
});

describe("readUtf8File", () => {
  // ----- 正常系 -----
  it("UTF-8 として往復できる内容をそのまま返す", () => {
    const target = place("work/sample.txt", "日本語の本文");

    expect(readUtf8File(target)).toBe("日本語の本文");
  });

  // ----- 異常系 -----
  it("UTF-8 として往復できないファイルは null を返して知らせる", () => {
    const target = join(root, "work", "broken.bin");
    mkdirSync(join(root, "work"), { recursive: true });
    writeFileSync(target, Buffer.from([0xff, 0xfe, 0x00]));

    expect(readUtf8File(target)).toBeNull();
    expect(console.error).toHaveBeenCalledOnce();
  });
});

describe("updateFile", () => {
  // ----- 正常系 -----
  it("相対パスのファイルを書き換え、書き換えたパスを返す", () => {
    place("work/sample.txt", "before");

    expect(updateFile("work/sample.txt", () => "after", false)).toBe(join("work", "sample.txt"));
    expect(readFileSync(join(root, "work", "sample.txt"), "utf8")).toBe("after");
  });

  // ----- 異常系 -----
  it("存在しないファイルには null を返す", () => {
    expect(updateFile("work/不在.txt", () => "after", false)).toBeNull();
  });
});

describe("updateAbsoluteFile", () => {
  // ----- 正常系 -----
  it("dry-run では書き込まずに対象パスだけを返す", () => {
    const target = place("work/sample.txt", "before");

    expect(updateAbsoluteFile(target, () => "after", true)).toBe(join("work", "sample.txt"));
    expect(readFileSync(target, "utf8")).toBe("before");
  });

  // ----- 異常系 -----
  it("変換結果が null なら書き込まず null を返す", () => {
    const target = place("work/sample.txt", "before");

    expect(updateAbsoluteFile(target, () => null, false)).toBeNull();
    expect(readFileSync(target, "utf8")).toBe("before");
  });

  it("変換結果が元と同じなら書き込まず null を返す", () => {
    const target = place("work/sample.txt", "same");

    expect(updateAbsoluteFile(target, (content) => content, false)).toBeNull();
  });

  it("UTF-8 として読めないファイルは変換せず null を返す", () => {
    const target = join(root, "work", "broken.bin");
    mkdirSync(join(root, "work"), { recursive: true });
    writeFileSync(target, Buffer.from([0xff, 0xfe, 0x00]));
    const transformer = vi.fn(() => "after");

    expect(updateAbsoluteFile(target, transformer, false)).toBeNull();
    expect(transformer).not.toHaveBeenCalled();
  });
});

describe("removeTarget", () => {
  // ----- 正常系 -----
  it("ディレクトリを再帰的に取り除き、相対パスを返す", () => {
    place("work/nested/sample.txt", "本文");

    expect(removeTarget("work", false)).toBe("work");
    expect(existsSync(join(root, "work"))).toBe(false);
  });

  it("dry-run では取り除かずに相対パスだけを返す", () => {
    place("work/sample.txt", "本文");

    expect(removeTarget("work", true)).toBe("work");
    expect(existsSync(join(root, "work"))).toBe(true);
  });

  // ----- 異常系 -----
  it("存在しない対象には null を返す", () => {
    expect(removeTarget("work/不在", false)).toBeNull();
  });
});

describe("listFilesRecursive", () => {
  // ----- 正常系 -----
  it("入れ子のファイルをすべて集める", () => {
    place("tree/a.txt", "a");
    place("tree/nested/b.txt", "b");

    expect(listFilesRecursive(join(root, "tree")).sort()).toEqual(
      [join(root, "tree", "a.txt"), join(root, "tree", "nested", "b.txt")].sort(),
    );
  });

  it("除外指定したディレクトリへ降りない", () => {
    place("tree/a.txt", "a");
    place("tree/skipped/b.txt", "b");

    expect(
      listFilesRecursive(join(root, "tree"), { excludedDirectories: new Set(["skipped"]) }),
    ).toEqual([join(root, "tree", "a.txt")]);
  });

  it("述語を満たさないファイルを集めない", () => {
    place("tree/a.txt", "a");
    place("tree/b.md", "b");

    expect(
      listFilesRecursive(join(root, "tree"), {
        shouldIncludeFile: (filePath) => filePath.endsWith(".md"),
      }),
    ).toEqual([join(root, "tree", "b.md")]);
  });

  it("渡された配列へ追記する", () => {
    place("tree/a.txt", "a");

    expect(listFilesRecursive(join(root, "tree"), {}, ["既存"])).toEqual([
      "既存",
      join(root, "tree", "a.txt"),
    ]);
  });

  // ----- 異常系 -----
  it("存在しないディレクトリでは読み取り失敗を投げる", () => {
    expect(() => listFilesRecursive(join(root, "不在"))).toThrow();
  });
});

describe("listChildFiles", () => {
  // ----- 正常系 -----
  it("直下のファイルだけを名前順で返す", () => {
    place("children/b.txt", "b");
    place("children/a.txt", "a");
    mkdirSync(join(root, "children", "nested"), { recursive: true });

    expect(listChildFiles("children")).toEqual([
      join(root, "children", "a.txt"),
      join(root, "children", "b.txt"),
    ]);
  });

  it("述語を満たすファイルだけを返す", () => {
    place("children/a.txt", "a");
    place("children/b.md", "b");

    expect(listChildFiles("children", (name) => name.endsWith(".md"))).toEqual([
      join(root, "children", "b.md"),
    ]);
  });

  // ----- 異常系 -----
  it("存在しないディレクトリでは読み取り失敗を投げる", () => {
    expect(() => listChildFiles("不在")).toThrow();
  });
});

describe("countOccurrences", () => {
  // ----- 正常系 -----
  it("重ならない出現回数を数える", () => {
    expect(countOccurrences("a-b-c-b", "b")).toBe(2);
  });

  // ----- 異常系 -----
  it("含まれない対象には 0 を返す", () => {
    expect(countOccurrences("a-b-c", "z")).toBe(0);
  });
});
