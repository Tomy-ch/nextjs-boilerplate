/**
 * PR へ貼る本文と、そこに載る所見の件数。
 *
 * @remarks
 * 読み手は PR のコメント 1 つで、走査の何を見ればよいかを決めます。だから**落ちた条件が先で、
 * 所見の一覧は後**です —— ゲートは行に紐づかない指標でも落ちるので、一覧を先に置くと「なぜ
 * 落ちたのか」がどこにも書かれていない本文になります。
 */

import { drawToolOutputInline } from "../lib/issue-body.js";
import { fieldOf, itemsOf, numberOf, textOf } from "./payload.js";

/** 段の並び順。表に無い段は最後へ。 */
const RANKS: Record<string, number> = { error: 0, warning: 1, note: 2 };

const LAST_RANK = 3;

/** 段が読めない結果の扱い。 */
const DEFAULT_LEVEL = "warning";

/** 位置が読めない結果の扱い。 */
const UNREADABLE = "?";

/** 位置の行が読めない結果の扱い。 */
const UNREADABLE_LINE = 0;

/** 所見が 1 件も無いときの本文。 */
const NO_ISSUES = "No issues.\n";

/** SARIF が持つ所見の件数。 */
export function countResults(sarif: unknown): number {
  return resultsOf(sarif).length;
}

/**
 * PR へ貼る本文を組む。
 *
 * @param sarif - 書き出した SARIF
 * @param gateStatus - ゲートの判定
 * @param failingConditions - 落ちた条件の箇条書き。1 件も無ければ空文字列
 */
export function renderSummary(
  sarif: unknown,
  gateStatus: string,
  failingConditions: string,
): string {
  const head = `Quality gate: ${gateStatus}\n\n${conditionsBlock(failingConditions)}`;
  const results = resultsOf(sarif);

  if (results.length === 0) {
    return `${head}${NO_ISSUES}`;
  }

  return (
    head +
    [...results]
      .sort((left, right) => rankOf(left) - rankOf(right))
      .map((result) => `${resultLine(result)}\n`)
      .join("")
  );
}

/** 走査をまたいで所見を 1 列に並べる。 */
function resultsOf(sarif: unknown): unknown[] {
  return itemsOf(fieldOf(sarif, "runs")).flatMap((run) => itemsOf(fieldOf(run, "results")));
}

/** 落ちた条件の節。1 件も無ければ節ごと落とす。 */
function conditionsBlock(failingConditions: string): string {
  return failingConditions === "" ? "" : `${failingConditions}\n`;
}

function levelOf(result: unknown): string {
  return textOf(fieldOf(result, "level"), DEFAULT_LEVEL);
}

function rankOf(result: unknown): number {
  return RANKS[levelOf(result)] ?? LAST_RANK;
}

/**
 * 所見 1 件を 2 行にする。
 *
 * @remarks
 * 位置・規則・説明はどれもこのリポジトリが書いたものではなく（ファイル名は PR を出した側が、説明は
 * SonarCloud が決める）、PR のコメントとして公開の面に載るので、記法として読まれない形で描きます。
 *
 * @param result - SARIF の所見 1 件
 * @returns 位置と規則の行、説明の行
 */
function resultLine(result: unknown): string {
  const location = fieldOf(itemsOf(fieldOf(result, "locations"))[0], "physicalLocation");
  const uri = textOf(fieldOf(fieldOf(location, "artifactLocation"), "uri"), UNREADABLE);
  const line = numberOf(fieldOf(fieldOf(location, "region"), "startLine"), UNREADABLE_LINE);
  const rule = textOf(fieldOf(result, "ruleId"), UNREADABLE);
  const message = textOf(fieldOf(fieldOf(result, "message"), "text"), "");
  const heading = `${drawToolOutputInline(`${uri}:${line}`)} ${drawToolOutputInline(rule)}`;

  return `- [${levelOf(result)}] ${heading}\n  - ${drawToolOutputInline(message)}`;
}
