// Playwright の JSON レポートから、基準画像と食い違った story を取り出す。
//
// 取り出した集合は 3 つの用途を持つ。PR コメントの一覧表、承認時に撮り直す範囲、そして手元で
// 見直す範囲で、どれも同じ集合であることに意味がある。表に出ていない story が承認で撮り直され
// ると、報告されていない差分が黙って基準画像へ入る。

import { BASELINE_MISSING, BASELINE_ORPHAN, baselineName } from "../../baseline/lib/orphans.js";
import { BASELINE_TAG } from "../../vrt/lib/expected-baselines.js";
import {
  asArray,
  isFailed,
  type JSONAnnotation,
  type JSONError,
  type JSONResult,
  type JSONTest,
  parseSpecs,
  taggedAnnotations,
  tagName,
} from "../lib/playwright-report.js";

/** 基準画像と食い違った story 1 件。 */
export type Failure = {
  /** story の id。基準画像のファイル名であり、撮り直す範囲の指定でもある。 */
  id: string;
  /** sidebar の見出しと story 名。人がどの部品かを読むために持つ。 */
  title: string;
  /** 配色テーマ（Playwright の project 名）。 */
  theme: string;
  /** 食い違った画素数。取り出せなければ null。 */
  diffPixels: number | null;
};

const STORY_ANNOTATION = "story";
const DIFF_PIXELS_PATTERN = /^[ \t]*(\d+) pixels .* are different\.$/m;
/** 一覧表に並べる上限。これを超えた分は件数だけを添える。 */
export const TABLE_LIMIT = 20;

/**
 * JSON レポートから食い違った story を取り出す。
 *
 * @remarks
 * 期待した形でなければ例外を投げます。0 件へ縮退させると、レポートの形が変わったときに
 * 「差分なし」と読めてしまい、承認の範囲も空になります。
 *
 * @param json - Playwright の JSON レポート
 */
export function collectFailures(json: string): Failure[] {
  const failures: Failure[] = [];

  for (const spec of parseSpecs(json)) {
    for (const test of asArray<JSONTest>(spec.tests)) {
      if (!isFailed(test)) continue;
      const id = storyID(test.annotations);
      if (id === null) continue;
      failures.push({
        id,
        title: typeof spec.title === "string" ? spec.title : id,
        theme: typeof test.projectName === "string" ? test.projectName : "",
        diffPixels: diffPixels(test.results),
      });
    }
  }

  return failures.sort((a, b) => a.id.localeCompare(b.id) || a.theme.localeCompare(b.theme));
}

/** PR コメントへ載せる一覧表。 */
export function formatTable(failures: Failure[]): string {
  if (failures.length === 0) return "差分はありません。";

  const shown = failures.slice(0, TABLE_LIMIT);
  const rows = shown.map(
    (failure) =>
      `| ${cell(failure.title)} | ${cell(failure.theme)} | ${formatPixels(failure.diffPixels)} | \`${failure.id}\` |`,
  );
  const table = [
    `${failures.length} 件の story が基準画像と食い違いました。`,
    "",
    "| story | テーマ | 差分 | id |",
    "| --- | --- | --- | --- |",
    ...rows,
  ];
  if (failures.length > shown.length) {
    table.push(
      "",
      `ほか ${failures.length - shown.length} 件（全件は artifact のレポートで見る）。`,
    );
  }

  return table.join("\n");
}

/**
 * 撮影対象を失った基準画像の一覧。
 *
 * @remarks
 * **孤児は撮り直しでは直りません。** 撮る相手が居ないので、消すしかありません。一覧は 1 対 1 の
 * 検査が注記へ載せます（`baseline/lib/orphans.ts`）。
 *
 * これを運ぶのは、撮り直しが**全数へ落ちずに済む**ようにするためです。孤児の名前が分かれば消す
 * 対象を名指しできます。分からないと「対応が落ちた」という事実しか無く、孤児と範囲外を区別
 * できないので全数を撮り直すほかありません —— そのとき、報告されていない画像まで置き直されます。
 *
 * @param json - Playwright の JSON レポート
 * @returns 置き場からの相対パス
 */
export function collectOrphanBaselines(json: string): string[] {
  return taggedAnnotations(json, BASELINE_TAG, BASELINE_ORPHAN);
}

/**
 * 基準画像を持たない撮影対象の名前。
 *
 * @remarks
 * 比較した実行では撮影そのものが落ちるので一覧に載りますが、**絵を決める入力が前と同じで比較を
 * 省いた実行では、落ちるのは 1 対 1 の検査だけ**です。そのとき撮り直す相手はここからしか分かりません。
 *
 * @param json - Playwright の JSON レポート
 */
export function collectMissingBaselines(json: string): string[] {
  return taggedAnnotations(json, BASELINE_TAG, BASELINE_MISSING).map(baselineName);
}

/** 撮り直す範囲として渡す story の id。テーマ違いは同じ id なので 1 件に畳む。 */
export function formatStoryIDs(failures: Failure[]): string {
  return [...new Set(failures.map((failure) => failure.id))].sort().join(",");
}

// 注記から story の id を取る。注記が無いものは VRT の対象外なので飛ばす。
function storyID(annotations: unknown): string | null {
  for (const annotation of asArray<JSONAnnotation>(annotations)) {
    if (annotation.type === STORY_ANNOTATION && typeof annotation.description === "string") {
      return annotation.description;
    }
  }

  return null;
}

// 食い違った画素数はエラー本文にしか出ない。取れなくても報告は続ける（件数と id は分かる）。
function diffPixels(results: unknown): number | null {
  for (const result of asArray<JSONResult>(results)) {
    for (const error of asArray<JSONError>(result.errors)) {
      if (typeof error.message !== "string") continue;
      const match = DIFF_PIXELS_PATTERN.exec(error.message);
      if (match) return Number(match[1]);
    }
  }

  return null;
}

/**
 * 表の升目へ入れられる形にする。
 *
 * @remarks
 * story の見出しはソースが決めるので、PR を出した側が中身を持ちます。この表は畳んだフェンスの
 * 外で描画されるため、升目の区切りと改行をそのまま通すと、行の形を壊して以降を任意の Markdown
 * として書けます。
 *
 * **逆斜線を先に退避します。** 後に回すと、退避のために足した逆斜線まで対象になり、区切りの
 * 退避が打ち消されます。
 */
function cell(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\|/g, String.raw`\|`)
    .replace(/[\r\n]+/g, " ");
}

function formatPixels(pixels: number | null): string {
  return pixels === null ? "—" : `${pixels.toLocaleString("en-US")} px`;
}
