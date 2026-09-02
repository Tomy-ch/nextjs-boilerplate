// Playwright の JSON レポートから、基準画像と食い違った画面を取り出す。
//
// 取り出した集合は 3 つの用途を持つ。PR コメントの一覧、承認時に撮り直す範囲、そして手元で
// 見直す範囲で、どれも同じ集合であることに意味がある。一覧に出ていない画面が承認で撮り直され
// ると、報告されていない差分が黙って基準画像へ入る（story 側と同じ不変条件）。
import { SCREEN_BASELINE_TAG } from "../../e2e/lib/screen-baselines.js";
import { asArray, isFailed, type JSONTest, parseSpecs, tagName } from "../lib/playwright-report.js";

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
 * 1 対 1 の対応を見る spec は画面ではないので外します。あの検査が落ちたときに要るのは、孤児を
 * 消すことと欠けているぶんを撮ることで、どちらも別の一覧が運びます
 * （{@link collectOrphanScreenBaselines} / {@link collectMissingScreenBaselines}）。
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
      if (!isFailed(test)) continue;
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
