// Playwright の JSON レポートから、基準画像と食い違った story を取り出す。
//
// 取り出した集合は 2 つの用途を持つ。1 つは PR コメントの一覧表、もう 1 つは承認時に
// 撮り直す範囲で、どちらも同じ集合であることに意味がある。表に出ていない story が承認で
// 撮り直されると、報告されていない差分が黙って基準画像へ入る。
import type {
  JSONReport,
  JSONReportSpec,
  JSONReportSuite,
  JSONReportTest,
  JSONReportTestResult,
} from "@playwright/test/reporter";

import { BASELINE_TAG } from "../../vrt/lib/orphan-baselines.js";

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

/**
 * 読むときの形。**キーの名前は Playwright の型から導き、値は信用しない。**
 *
 * @remarks
 * 与えられる JSON は外から来るため、どのキーも欠けうるものとして受けます。一方でキーの名前は
 * 実物が決めるので、手で書き写しません。写すと**実在しないキーを宣言できてしまい**、型に守られて
 * いるつもりのまま常に空を読みます（`tags` は spec が持つのに test 側へ宣言していた、が実例）。
 */
type Loose<T> = { [K in keyof T]?: unknown };

type JSONTest = Loose<JSONReportTest>;
type JSONSpec = Loose<JSONReportSpec>;
type JSONSuite = Loose<JSONReportSuite>;

/** 入れ子の要素は、公開名ではなく持ち主の項目から導く。名前だけの export に依らずに済む。 */
type JSONAnnotation = Loose<JSONReportTest["annotations"][number]>;
type JSONError = Loose<JSONReportTestResult["errors"][number]>;

const STORY_ANNOTATION = "story";
const DIFF_PIXELS_PATTERN = /^\s*(\d+) pixels .* are different\.$/m;
/** 一覧表に並べる上限。これを超えた分は件数だけを添える。 */
export const TABLE_LIMIT = 20;

/**
 * JSON レポートから食い違った story を取り出す。
 *
 * @remarks
 * 期待した形でなければ例外を投げます。0 件へ縮退させると、レポートの形が変わったときに
 * 「差分なし」と読めてしまい、承認の範囲も空になります。
 */
export function collectFailures(json: string): Failure[] {
  const report = JSON.parse(json) as Loose<JSONReport>;
  if (!Array.isArray(report.suites)) throw new Error("JSON レポートに suites がありません");

  const failures: Failure[] = [];
  for (const spec of flattenSpecs(report.suites as JSONSuite[])) {
    for (const test of asArray<JSONTest>(spec.tests)) {
      if (test.status === "expected") continue;
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
      `| ${failure.title} | ${failure.theme} | ${formatPixels(failure.diffPixels)} | \`${failure.id}\` |`,
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
 * tag をレポートに載る形へ揃える。
 *
 * @remarks
 * 宣言は `@` 付きで書きますが、レポートには `@` の無い名前で載ります。宣言の綴りのまま突き合わせ
 * ると、どの tag にも当たりません。
 */
function tagName(tag: string): string {
  return tag.startsWith("@") ? tag.slice(1) : tag;
}

/**
 * 基準画像と撮影対象の 1 対 1 対応が落ちたか。
 *
 * @remarks
 * この検査は story ではないので {@link collectFailures} は拾いません（id の注記を持たない）。
 * それでいて、落ちたときに要るのは**全数の撮り直し**です（理由は `vrt/lib/baseline-store.ts`）。
 *
 * @param json - Playwright の JSON レポート
 */
export function hasBaselineFailure(json: string): boolean {
  const report = JSON.parse(json) as Loose<JSONReport>;
  if (!Array.isArray(report.suites)) throw new Error("JSON レポートに suites がありません");

  const checks = flattenSpecs(report.suites as JSONSuite[]).filter((spec) =>
    asArray<string>(spec.tags).some((tag) => tagName(tag) === tagName(BASELINE_TAG)),
  );

  // 見つからないことを「孤児なし」と答えない。1 対 1 の検査は全数の撮影に必ず含まれるので、
  // 当たらないのはレポートの形か tag の綴りが変わったときである。false を返すと、撮り直しは
  // 絞り込み側へ落ちて「差分がありません」で止まり、原因の見えない失敗になる。
  if (checks.length === 0) {
    throw new Error(
      `レポートに ${BASELINE_TAG} の spec がありません。全数の報告でないか、tag の載り方が変わっています`,
    );
  }

  return checks.some((spec) =>
    asArray<JSONTest>(spec.tests).some((test) => test.status !== "expected"),
  );
}

/** 撮り直す範囲として渡す story の id。テーマ違いは同じ id なので 1 件に畳む。 */
export function formatStoryIDs(failures: Failure[]): string {
  return [...new Set(failures.map((failure) => failure.id))].sort().join(",");
}

// suites は入れ子になる。spec は葉にしか無いので、たどって平らにする。
function flattenSpecs(suites: JSONSuite[]): JSONSpec[] {
  const specs: JSONSpec[] = [];
  for (const suite of suites) {
    specs.push(...asArray<JSONSpec>(suite.specs));
    specs.push(...flattenSpecs(asArray<JSONSuite>(suite.suites)));
  }

  return specs;
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
  for (const result of asArray<Loose<JSONReportTestResult>>(results)) {
    for (const error of asArray<JSONError>(result.errors)) {
      if (typeof error.message !== "string") continue;
      const match = DIFF_PIXELS_PATTERN.exec(error.message);
      if (match) return Number(match[1]);
    }
  }

  return null;
}

function formatPixels(pixels: number | null): string {
  return pixels === null ? "—" : `${pixels.toLocaleString("en-US")} px`;
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}
