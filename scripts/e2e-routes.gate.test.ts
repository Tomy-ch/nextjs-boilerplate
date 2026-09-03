import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  APP_DIR,
  findStaleAbsentDeclarations,
  findUnknownRoutes,
  listRouteLiterals,
  toAppRoute,
} from "./lib/e2e-routes";

/**
 * E2E の spec が指す経路が、実在する route に着いていることを見るゲート。
 *
 * @remarks
 * 何を・なぜ見るかは [`e2e/README.md`](../e2e/README.md)「spec が指す経路は、実在する route で
 * なければならない」。走査と判定は [`lib/e2e-routes.ts`](lib/e2e-routes.ts) が持ちます。
 */

const REPOSITORY_ROOT = path.resolve(import.meta.dirname, "..");

/** spec の置き場。 */
const SPEC_DIR = "e2e";

/** spec のファイル名の末尾。`lib/` の判定（`*.test.ts`）は対象外。 */
const SPEC_SUFFIX = ".spec.ts";

/**
 * 実在しないことが意図である経路。
 *
 * @remarks
 * **「まだ画面が無い」は理由になりません。** 挙げてよいのは、実在しないことそのものを確かめて
 * いる spec が指す経路だけです。どの spec も指さなくなった宣言と、画面が置かれて実在するように
 * なった宣言は、どちらもゲートが落とします。
 */
const ABSENT_BY_DESIGN: readonly string[] = [
  // 保護の判定は接頭辞の宣言だけで行うため、画面を持たない接頭辞でも同じ経路を通る
  // （`e2e/journeys/auth.spec.ts`）。
  "/account",
  // 止めているあいだは経路の有無に関わらず入口が差し替える（`e2e/maintenance/stopped.spec.ts`）。
  "/help",
  // 受け口が他に無い URL を開いて 404 の面を出す（`e2e/journeys/browse.spec.ts`）。 // sample:line
  "/この経路は存在しない", // sample:line
];

/** ディレクトリ配下のファイルを、リポジトリルート相対（`/` 区切り）で並べる。 */
function listFiles(directory: string, suffix: string): string[] {
  return fs
    .readdirSync(path.join(REPOSITORY_ROOT, directory), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(suffix))
    .map((entry) =>
      path
        .relative(REPOSITORY_ROOT, path.join(entry.parentPath, entry.name))
        .split(path.sep)
        .join("/"),
    );
}

const routes = listFiles(APP_DIR, "")
  .map(toAppRoute)
  .filter((route) => route !== null);

const literals = listFiles(SPEC_DIR, SPEC_SUFFIX).flatMap((file) =>
  listRouteLiterals(fs.readFileSync(path.join(REPOSITORY_ROOT, file), "utf8")),
);

describe("E2E の spec が指す経路", () => {
  // ----- 正常系 -----
  it("走査が空へ縮退していない", () => {
    // 0 件へ縮退すると、以下の 2 つが「違反なし」として緑で通る。
    expect(routes.length).toBeGreaterThan(0);
    expect(literals.length).toBeGreaterThan(0);
  });

  it("すべて実在する route に着く", () => {
    expect(findUnknownRoutes(literals, routes, ABSENT_BY_DESIGN)).toEqual([]);
  });

  it("実在しないと宣言した経路は、spec から指されていて実際に実在しない", () => {
    expect(findStaleAbsentDeclarations(literals, routes, ABSENT_BY_DESIGN)).toEqual([]);
  });
});
