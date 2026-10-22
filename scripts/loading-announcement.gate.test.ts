import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  findSilentSkeletons,
  isSkeletonModule,
  mountsAnnouncer,
  type SourceModule,
} from "./lib/loading-announcement";

/**
 * 待機表示が、読み込み中であることを支援技術へ告げる葉を置いているかのゲート。
 *
 * @remarks
 * 判定の中身は `lib/loading-announcement.ts` が持ち、ここはツリーの走査だけを担う
 * （`server-only.gate.test.ts` と同形）。
 *
 * 葉は何も描かないので、外しても見た目もテストも変わらず、告知だけが黙って消える。
 */

const REPOSITORY_ROOT = resolve(import.meta.dirname, "..");
const FEATURES_ROOT = join(REPOSITORY_ROOT, "src", "features");
const ROOT_LAYOUT = join(REPOSITORY_ROOT, "src", "app", "layout.tsx");

function collect(directory: string, into: SourceModule[]): SourceModule[] {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      collect(path, into);
      continue;
    }

    if (/\.tsx$/.test(path) && !/\.(test|stories)\.tsx$/.test(path)) {
      into.push({ path: relative(REPOSITORY_ROOT, path), content: readFileSync(path, "utf8") });
    }
  }

  return into;
}

// 木を歩くので既定の 5 秒では足りない（`docs/testing-conventions.md#gates-that-scan-the-whole-repository`）。
const TIMEOUT_MS = 300_000;

describe("読み込みの告知", () => {
  // ----- 正常系 -----
  it("root layout が告げる領域の Provider を置いている", () => {
    expect(
      mountsAnnouncer({
        path: relative(REPOSITORY_ROOT, ROOT_LAYOUT),
        content: readFileSync(ROOT_LAYOUT, "utf8"),
      }),
    ).toBe(true);
  });

  it(
    "feature の待機表示はどれも告知の葉を置いている",
    () => {
      const modules = collect(FEATURES_ROOT, []);

      // 走査が空振りすると、違反ゼロを報告したままゲートが黙る。違反より先に「見た件数」を主張する。
      expect(modules.filter(({ path }) => isSkeletonModule(path)).length).toBeGreaterThan(0); // sample:line
      expect(findSilentSkeletons(modules).join("\n")).toBe("");
    },
    TIMEOUT_MS,
  );
});
