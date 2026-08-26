import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, sep } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { byCodeUnit, collectMarkdownFiles, isExcludedPath } from "./markdown-files";

let root: string;

/** `<root>/<relativePath>` へ親ごとファイルを置く。 */
function place(relativePath: string, content = ""): void {
  const target = join(root, relativePath);
  mkdirSync(join(target, ".."), { recursive: true });
  writeFileSync(target, content);
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "markdown-files-"));
});

afterEach(() => {
  rmSync(root, { force: true, recursive: true });
});

describe("isExcludedPath", () => {
  // ----- 正常系 -----
  it("除外接頭辞そのものを外す", () => {
    expect(isExcludedPath("graphify-out")).toBe(true);
    expect(isExcludedPath(join(".claude", "worktrees"))).toBe(true);
    expect(isExcludedPath("storybook-static")).toBe(true);
    expect(isExcludedPath("tmp")).toBe(true);
    expect(isExcludedPath("dist")).toBe(true);
    expect(isExcludedPath(join("docs", "portal", "guides"))).toBe(true);
  });

  it("除外接頭辞の配下を外す", () => {
    expect(isExcludedPath(join("graphify-out", "GRAPH_REPORT.md"))).toBe(true);
    expect(isExcludedPath(join("storybook-static", "README.md"))).toBe(true);
    expect(isExcludedPath(join("tmp", "reviews", "architecture.md"))).toBe(true);
    expect(isExcludedPath(join("dist", "README.md"))).toBe(true);
    expect(isExcludedPath(join("docs", "portal", "guides", "index.md"))).toBe(true);
  });

  // ----- 異常系 -----
  it("名前が前方一致するだけの兄弟を外さない", () => {
    expect(isExcludedPath(".claude/worktrees-backup".replaceAll("/", sep))).toBe(false);
    expect(isExcludedPath("graphify-output")).toBe(false);
    expect(isExcludedPath(join("distribution", "README.md"))).toBe(false);
    expect(isExcludedPath("tmpfile.md")).toBe(false);
    expect(isExcludedPath(join("docs", "portal", "guidelines", "index.md"))).toBe(false);
  });

  it("関係のないパスを外さない", () => {
    expect(isExcludedPath(join("docs", "adr", "0090.md"))).toBe(false);
    expect(isExcludedPath(join("docs", "portal", "manifest.yaml"))).toBe(false);
  });
});

describe("collectMarkdownFiles", () => {
  // ----- 正常系 -----
  it("入れ子の Markdown をルート相対で名前順に集める", () => {
    place("b.md");
    place(join("docs", "a.md"));

    expect(collectMarkdownFiles(root)).toEqual(["b.md", join("docs", "a.md")].sort());
  });

  // ----- 異常系 -----
  it("Markdown でないファイルを集めない", () => {
    place("README.txt");

    expect(collectMarkdownFiles(root)).toEqual([]);
  });

  it("node_modules と .git へ降りない", () => {
    place(join("node_modules", "pkg", "README.md"));
    place(join(".git", "NOTES.md"));

    expect(collectMarkdownFiles(root)).toEqual([]);
  });

  it("除外接頭辞の配下へ降りない", () => {
    place(join("graphify-out", "GRAPH_REPORT.md"));
    place(join("storybook-static", "README.md"));
    place(join("tmp", "reviews", "architecture.md"));
    place(join("dist", "README.md"));
    place(join("docs", "portal", "guides", "index.md"));

    expect(collectMarkdownFiles(root)).toEqual([]);
  });
});

describe("byCodeUnit", () => {
  // ----- 正常系 -----
  it("前の方が先に来る組では負を返す", () => {
    expect(byCodeUnit("a.md", "b.md")).toBeLessThan(0);
  });

  it("後の方が先に来る組では正を返す", () => {
    expect(byCodeUnit("b.md", "a.md")).toBeGreaterThan(0);
  });

  it("大文字と小文字をロケールに依らずコード単位で並べる", () => {
    expect(byCodeUnit("Z.md", "a.md")).toBeLessThan(0);
  });
});
