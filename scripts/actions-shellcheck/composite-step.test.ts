import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { parseActionFile, targetFiles } from "./composite-step";

let root: string;

/** `<root>/.github/actions/<name>/action.yml` を置く。 */
function placeAction(name: string, body = ""): void {
  const dir = join(root, ".github", "actions", name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "action.yml"), body);
}

/** composite action の定義を組み立てる。 */
const composite = (...steps: string[]): string =>
  ["runs:", "  using: composite", "  steps:", ...steps].join("\n");

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "composite-step-"));
});

afterEach(() => {
  rmSync(root, { force: true, recursive: true });
});

describe("targetFiles", () => {
  // ----- 正常系 -----
  it("定義ファイルをルート相対パスで名前順に返す", () => {
    placeAction("setup");
    placeAction("notify");

    expect(targetFiles(root)).toEqual([
      join(".github", "actions", "notify", "action.yml"),
      join(".github", "actions", "setup", "action.yml"),
    ]);
  });

  // ----- 異常系 -----
  it("定義が無ければ空を返す", () => {
    expect(targetFiles(root)).toEqual([]);
  });
});

describe("parseActionFile", () => {
  // ----- 正常系 -----
  it("リテラルの run から本文と位置を取り出す", () => {
    const source = composite("    - shell: bash", "      run: |", "        echo hello");

    const parsed = parseActionFile("a.yml", source);

    expect(parsed.steps).toHaveLength(1);
    expect(parsed.steps[0]).toMatchObject({
      file: "a.yml",
      shell: "bash",
      script: "echo hello\n",
      firstLine: 6,
      columnBase: 8,
    });
  });

  it("パーサ経由で数えたステップ数を併せて返す", () => {
    const source = composite(
      "    - shell: bash",
      "      run: |",
      "        echo one",
      "    - shell: bash",
      "      run: |",
      "        echo two",
    );

    expect(parseActionFile("a.yml", source).expectedSteps).toBe(2);
  });

  it("run を持たないステップを対象外にする", () => {
    const source = composite("    - uses: actions/checkout@v7");

    expect(parseActionFile("a.yml", source).steps).toEqual([]);
  });

  it("composite でない action を対象外にする", () => {
    const source = ["runs:", "  using: node24", "  main: index.js"].join("\n");

    expect(parseActionFile("a.yml", source).steps).toEqual([]);
  });

  it("マージキー経由で書かれた run と shell を辿る", () => {
    const source = [
      "base: &base",
      "  shell: bash",
      "  run: |",
      "    echo hello",
      composite("    - <<: *base"),
    ].join("\n");

    expect(parseActionFile("a.yml", source).steps).toHaveLength(1);
  });

  it("空行で始まるリテラルでも最初の非空行からインデント幅を採る", () => {
    const source = composite("    - shell: bash", "      run: |", "", "        echo hello");

    expect(parseActionFile("a.yml", source).steps[0]?.columnBase).toBe(8);
  });

  // ----- 異常系 -----
  it("YAML として読めない定義を落とす", () => {
    expect(() => parseActionFile("a.yml", "runs:\n  - a\n b: c\n")).toThrow(
      /^a\.yml: YAML として読めません: /,
    );
  });

  it("composite の steps がリストとして読めない定義を落とす", () => {
    const source = ["runs:", "  using: composite", "  steps: {}"].join("\n");

    expect(() => parseActionFile("a.yml", source)).toThrow(
      "a.yml: composite action の runs.steps がリストとして読めません",
    );
  });

  it("run の値が文字列でない定義を落とす", () => {
    const source = composite("    - shell: bash", "      run:", "        nested: value");

    expect(() => parseActionFile("a.yml", source)).toThrow(/run: の値が文字列ではありません/);
  });

  it("ブロック折り畳みで書かれた run を落とす", () => {
    const source = composite("    - shell: bash", "      run: >", "        echo hello");

    expect(() => parseActionFile("a.yml", source)).toThrow(
      /run: にブロック折り畳み（>）は使えません/,
    );
  });

  it("shell を持たない run ステップを落とす", () => {
    const source = composite("    - run: |", "        echo hello");

    expect(() => parseActionFile("a.yml", source)).toThrow(
      /run ステップに shell: の指定がありません/,
    );
  });

  it("参照先の無い alias を落とす", () => {
    const source = composite("    - <<: *missing");

    expect(() => parseActionFile("a.yml", source)).toThrow(/YAML を解決できません/);
  });
});
