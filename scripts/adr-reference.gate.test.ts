import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { findSectionedAdrReferences, formatSectionedAdrReferences } from "./lib/adr-reference";
import { collectMarkdownFiles } from "./lib/markdown-files";

/**
 * ADR を指す参照が、節番号を伴っていないかを見るゲート。
 *
 * @remarks
 * 判定の中身は {@link findSectionedAdrReferences} が持ち、ここはツリーの走査だけを担う
 * （`doc-links.gate.test.ts` と同形）。
 *
 * **節番号はリンクと違って、切れても形が残る。** `doc-links` はリンク先のファイルが実在するかを
 * 見るが、その先の節までは見ない。節を足す・並べ替える・畳むと番号は動き、指していた側は
 * 綴りを変えないまま別の節を指す。落ちるものが無いので、誰も気付かない。
 *
 * 番号を直し続ける代わりに、**指す形から番号を外した**。どの節かは指す側が要旨を書いて示す。
 */

const REPOSITORY_ROOT = resolve(import.meta.dirname, "..");

/**
 * 走査対象の下限。
 *
 * @remarks
 * 走査が 0 件へ縮退すると、違反も 0 件で一致し、ゲートが「違反なし」を報告する向きに壊れた
 * ことを結果から見分けられない。実数より十分低く採る —— 守るのは縮退であって増減ではない。
 */
const MINIMUM_MARKDOWN = 100;

const TIMEOUT_MS = 30_000;

describe("ADR の参照", () => {
  // ----- 正常系 -----
  it(
    "ADR を指す形が `[NNNN](path)` だけである",
    () => {
      const files = collectMarkdownFiles(REPOSITORY_ROOT);

      expect(files.length).toBeGreaterThan(MINIMUM_MARKDOWN);

      const found = files.flatMap((file) =>
        findSectionedAdrReferences(file, readFileSync(join(REPOSITORY_ROOT, file), "utf8")),
      );

      expect(formatSectionedAdrReferences(found)).toBe("");
    },
    TIMEOUT_MS,
  );
});
