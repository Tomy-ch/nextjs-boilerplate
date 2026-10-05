// 原典との突合の目録の、行の形を見るゲート。
//
// 見るのは形だけである —— 判定が正しいかは原典を読まないと決まらず、それは
// `interpretation-audit` の仕事で、ここではない。ここが守るのは「反証できる形をしているか」で、
// 指し先が消えた行と、前提を持たない行を落とす。

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const REPOSITORY_ROOT = path.resolve(import.meta.dirname, "..");
const LEDGER_PATH = "docs/reference/upstream-interpretations.md";
const MIRROR_PATH = "docs/reference/upstream-interpretations.ja.md";

/** 判定として認める 3 値。4 つめを作らせない。 */
const VERDICTS = ["No difference", "Undeclared difference", "Declared deviation"] as const;

type Row = {
  readonly line: number;
  readonly source: string;
  readonly ours: string;
  readonly verdict: string;
  readonly premise: string;
  readonly checkedAt: string;
};

/** 目録の表の列数。判定の 3 値を説明する表など、この文書の他の表は列数で見分ける。 */
const LEDGER_COLUMNS = 5;

/** Markdown の表の 1 行をセルに分ける。表の行でなければ `undefined`。 */
function splitCells(raw: string): readonly string[] | undefined {
  const line = raw.trim();

  if (!line.startsWith("|") || !line.endsWith("|")) {
    return undefined;
  }

  return line
    .slice(1, -1)
    .split(" | ")
    .map((cell) => cell.trim());
}

/**
 * 目録の表から行を読む。見出しが 5 列の表の、区切り行より下をすべて行とみなす。
 *
 * 判定の文言では行を選ばない。文言で選ぶと、未知の判定を持つ行が黙って落ち、
 * 「判定が 3 値のどれかである」が検査する前に消えてしまう。
 */
function parseRows(relativePath: string): readonly Row[] {
  const lines = readFileSync(path.join(REPOSITORY_ROOT, relativePath), "utf8").split("\n");
  const rows: Row[] = [];
  let inLedger = false;

  lines.forEach((raw, index) => {
    const cells = splitCells(raw);

    if (cells === undefined) {
      inLedger = false;
      return;
    }

    const previous = index > 0 ? splitCells(lines[index - 1] ?? "") : undefined;

    // 区切り行に出会ったら、その直前の見出しの列数で、目録の表かを決める。
    if (cells.every((cell) => /^:?-+:?$/.test(cell))) {
      inLedger = previous?.length === LEDGER_COLUMNS;
      return;
    }

    if (!inLedger) {
      return;
    }

    rows.push({
      line: index + 1,
      source: cells[0] ?? "",
      ours: cells[1] ?? "",
      verdict: cells[2] ?? "",
      premise: cells[3] ?? "",
      checkedAt: cells[4] ?? "",
    });
  });

  return rows;
}

/** セル内の Markdown リンクが指すリポジトリ相対パス。 */
function linkedPaths(cell: string): readonly string[] {
  return [...cell.matchAll(/\]\(([^)]+)\)/g)].flatMap((match) => {
    const target = (match[1] ?? "").split("#")[0] ?? "";

    if (target === "" || target.startsWith("http")) {
      return [];
    }

    return [path.normalize(path.join("docs/reference", target))];
  });
}

describe("原典との突合の目録", () => {
  const rows = parseRows(LEDGER_PATH);

  // ----- 正常系 -----
  it("行を 1 件以上持つ", () => {
    expect(rows.length).toBeGreaterThan(0);
  });

  it("日本語の写しが、正本と同じ数の行を持つ", () => {
    // 写しの判定は日本語の語で書くので、文言ではなく行数で対を見る。
    expect(parseRows(MIRROR_PATH)).toHaveLength(rows.length);
  });

  it("判定が 3 値のどれかである", () => {
    const unknown = rows.filter(
      (row) => !VERDICTS.some((verdict) => row.verdict.includes(verdict)),
    );

    expect(unknown.map((row) => `${LEDGER_PATH}:${row.line}`)).toEqual([]);
  });

  it("こちら側の指し先がすべて実在する", () => {
    const missing = rows.flatMap((row) =>
      linkedPaths(row.ours)
        .filter((target) => !existsSync(path.join(REPOSITORY_ROOT, target)))
        .map((target) => `${LEDGER_PATH}:${row.line} → ${target}`),
    );

    expect(missing).toEqual([]);
  });

  it("行ごとに、確かめた日を持つ", () => {
    const undated = rows.filter((row) => !/^\d{4}-\d{2}-\d{2}$/.test(row.checkedAt));

    expect(undated.map((row) => `${LEDGER_PATH}:${row.line}`)).toEqual([]);
  });

  // ----- 異常系 -----
  it("前提を持たない行を置かない", () => {
    // 前提は、読み手がこの判定に反対するための唯一の手掛かりである。空欄の行は、
    // 判定だけが在って反証の手立てが無い状態になる。
    const bare = rows.filter((row) => row.premise.length < 20);

    expect(bare.map((row) => `${LEDGER_PATH}:${row.line} → ${row.source}`)).toEqual([]);
  });

  it("同じ対を 2 度並べない", () => {
    const seen = new Map<string, number>();
    const duplicated: string[] = [];

    for (const row of rows) {
      const key = `${row.source}||${row.ours}`;

      if (seen.has(key)) {
        duplicated.push(`${LEDGER_PATH}:${row.line} と :${seen.get(key)}`);
      }

      seen.set(key, row.line);
    }

    expect(duplicated).toEqual([]);
  });
});
