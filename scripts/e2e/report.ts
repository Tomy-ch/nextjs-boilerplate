// Playwright の JSON レポートから、基準画像と食い違った画面を取り出す。
//
// 取り出した集合は 3 つの用途を持つ。PR コメントの一覧、承認時に撮り直す範囲、そして手元で
// 見直す範囲で、どれも同じ集合であることに意味がある。一覧に出ていない画面が承認で撮り直され
// ると、報告されていない差分が黙って基準画像へ入る（story 側と同じ不変条件）。
import { SCREEN_BASELINE_TAG } from "../../e2e/lib/screen-baselines.js";
import { asArray, type JSONTest, parseSpecs, tagName } from "../lib/playwright-report.js";

/** 画面の見た目を比べている spec の在り処。ここに居ない spec はジャーニーなので対象外。 */
const VISUAL_SPEC = "visual/screens.spec.ts";

/** 基準画像と食い違った画面 1 件。 */
export type ScreenFailure = {
  /** 画面の名前。`e2e/lib/screens.ts` の宣言と同じ綴りで、基準画像のファイル名でもある。 */
  name: string;
  /** 撮った帯（Playwright の project 名）。 */
  band: string;
};

/**
 * JSON レポートから食い違った画面を取り出す。
 *
 * @remarks
 * 画面を比べている spec が 1 つも見つからなければ例外を投げます。0 件へ縮退させると、レポートの
 * 形か spec の置き場所が変わったときに「差分なし」と読めてしまいます。
 *
 * 1 対 1 の対応を見る spec は画面ではないので外します。落ちたときに要るのは全数の撮り直しで
 * あって、名指しで開き直すことではありません（{@link hasScreenBaselineFailure}）。
 *
 * @param json - Playwright の JSON レポート
 */
export function collectFailedScreens(json: string): ScreenFailure[] {
  const specs = parseSpecs(json).filter(
    (spec) => typeof spec.file === "string" && spec.file.endsWith(VISUAL_SPEC),
  );

  if (specs.length === 0) {
    throw new Error(`レポートに ${VISUAL_SPEC} の spec がありません`);
  }

  const failures: ScreenFailure[] = [];

  for (const spec of specs) {
    if (asArray(spec.tags).some((tag) => tagName(tag) === tagName(SCREEN_BASELINE_TAG))) {
      continue;
    }

    for (const test of asArray<JSONTest>(spec.tests)) {
      if (test.status === "expected") continue;
      failures.push({
        name: typeof spec.title === "string" ? spec.title : "",
        band: typeof test.projectName === "string" ? test.projectName : "",
      });
    }
  }

  return failures.sort((a, b) => a.name.localeCompare(b.name) || a.band.localeCompare(b.band));
}

/** 手元で見直す範囲として渡す画面の名前。帯違いは同じ名前なので 1 件に畳む。 */
export function formatScreenNames(failures: readonly ScreenFailure[]): string {
  return [...new Set(failures.map((failure) => failure.name))].sort().join(",");
}

/**
 * 基準画像と撮影対象の 1 対 1 対応が落ちたか。
 *
 * @remarks
 * この検査は画面ではないので {@link collectFailedScreens} は拾いません。落ちたときに要るのは
 * **全数の撮り直し**で、レポートに検査そのものが無ければ例外を投げます（0 件を「孤児なし」と
 * 答えない）。どちらの理由も story 側の同じ検査（`scripts/vrt/report.ts` の `hasBaselineFailure`）
 * と共通で、根拠は `baseline/lib/store.ts` が持ちます。
 *
 * @param json - Playwright の JSON レポート
 */
export function hasScreenBaselineFailure(json: string): boolean {
  const checks = parseSpecs(json).filter((spec) =>
    asArray(spec.tags).some((tag) => tagName(tag) === tagName(SCREEN_BASELINE_TAG)),
  );

  if (checks.length === 0) {
    throw new Error(
      `レポートに ${SCREEN_BASELINE_TAG} の spec がありません。全数の報告でないか、tag の載り方が変わっています`,
    );
  }

  return checks.some((spec) =>
    asArray<JSONTest>(spec.tests).some((test) => test.status !== "expected"),
  );
}
