// Playwright の JSON レポートを読むための足場。story 単位の撮影（`scripts/vrt`）と画面単位の
// 検証（`scripts/e2e`）が同じ形のレポートを読むので、たどり方だけをここへ置く。
import type {
  JSONReport,
  JSONReportSpec,
  JSONReportSuite,
  JSONReportTest,
  JSONReportTestResult,
} from "@playwright/test/reporter";

/**
 * 読むときの形。**キーの名前は Playwright の型から導き、値は信用しない。**
 *
 * @remarks
 * 与えられる JSON は外から来るため、どのキーも欠けうるものとして受けます。一方でキーの名前は
 * 実物が決めるので、手で書き写しません。写すと**実在しないキーを宣言できてしまい**、型に守られて
 * いるつもりのまま常に空を読みます。
 */
type Loose<T> = { [K in keyof T]?: unknown };

export type JSONTest = Loose<JSONReportTest>;
export type JSONSpec = Loose<JSONReportSpec>;
type JSONSuite = Loose<JSONReportSuite>;
export type JSONResult = Loose<JSONReportTestResult>;

/** 入れ子の要素は持ち主の項目から導く。要素型が個別に公開されていないため。 */
export type JSONAnnotation = Loose<JSONReportTest["annotations"][number]>;
export type JSONError = Loose<JSONReportTestResult["errors"][number]>;

/** 配列でない値を空として読む。欠けたキーを 0 件として扱うのはたどる側の都合。 */
export function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

/**
 * レポートの全 spec を平らに取り出す。
 *
 * @remarks
 * 期待した形でなければ例外を投げます。0 件へ縮退させると、レポートの形が変わったときに
 * 「失敗なし」と読めてしまいます。
 *
 * @param json - Playwright の JSON レポート
 */
export function parseSpecs(json: string): JSONSpec[] {
  const report = JSON.parse(json) as Loose<JSONReport>;

  if (!Array.isArray(report.suites)) throw new Error("JSON レポートに suites がありません");

  return flattenSpecs(report.suites as JSONSuite[]);
}

/**
 * tag をレポートに載る形へ揃える。宣言は `@` 付きで書くが、レポートには `@` の無い名前で載る。
 *
 * @remarks
 * 文字列でない要素は空へ倒します。`asArray` が見るのは外側が配列かどうかだけなので、要素まで
 * 信用すると、`tags` に文字列以外が混ざったレポートを読んだだけで落ちます。どの tag にも
 * 当たらない値として扱えば、突き合わせの結果は「その tag ではない」になります。
 *
 * @param tag - レポートに載っていた tag
 */
export function tagName(tag: unknown): string {
  if (typeof tag !== "string") return "";

  return tag.startsWith("@") ? tag.slice(1) : tag;
}

/**
 * その test が落ちたか。
 *
 * @remarks
 * **`expected` でないことを「落ちた」と読みません。** Playwright の status には `skipped` が
 * あり、条件付きで走らせない検査はそこに来ます。`!== "expected"` で判定すると、走らせないと
 * 決めた検査が毎回「落ちた」ことになります。
 *
 * 落ちたのは `unexpected`（失敗）と `flaky`（再試行で通ったが 1 度落ちた）の 2 つです。
 *
 * @param test - レポートの test
 */
export function isFailed(test: JSONTest): boolean {
  return test.status === "unexpected" || test.status === "flaky";
}

// suites は入れ子になる。spec は葉にしか無いので、たどって平らにする。
function flattenSpecs(suites: JSONSuite[]): JSONSpec[] {
  const specs: JSONSpec[] = [];

  for (const suite of suites) {
    specs.push(
      ...asArray<JSONSpec>(suite.specs),
      ...flattenSpecs(asArray<JSONSuite>(suite.suites)),
    );
  }

  return specs;
}
