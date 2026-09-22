import { describe, expect, it } from "vitest";

import {
  findMissingScreenSpecs,
  findOrphanSpecs,
  NO_ROUTES_MESSAGE,
  SPEC_ROOT,
  toScreenSpecPath,
  toSpecDir,
} from "./spec-routes";

describe("toSpecDir", () => {
  // ----- 正常系 -----
  it("route group の括弧を外す", () => {
    expect(toSpecDir("src/app/(group)/resources/page.tsx")).toBe(`${SPEC_ROOT}/group/resources`);
  });

  it("動的セグメントの角括弧は保つ", () => {
    expect(toSpecDir("src/app/(group)/resources/[id]/page.tsx")).toBe(
      `${SPEC_ROOT}/group/resources/[id]`,
    );
  });

  it("根の layout を仕様書の根へ写す", () => {
    expect(toSpecDir("src/app/layout.tsx")).toBe(SPEC_ROOT);
  });

  it("入れ子の route group を段ごとに外す", () => {
    expect(toSpecDir("src/app/(a)/(b)/page.tsx")).toBe(`${SPEC_ROOT}/a/b`);
  });

  it("開発専用の入口も写す", () => {
    expect(toSpecDir("src/app/dev/session/page.dev.tsx")).toBe(`${SPEC_ROOT}/dev/session`);
  });

  it("並行ルートのスロットは段ごと落とし、差し込む画面と同じ置き場へ写す", () => {
    expect(toSpecDir("src/app/admin/@breadcrumb/resources/page.tsx")).toBe(
      `${SPEC_ROOT}/admin/resources`,
    );
  });

  // ----- 異常系 -----
  it("page でも layout でもない入口は写さない", () => {
    expect(toSpecDir("src/app/(group)/resources/error.tsx")).toBeNull();
  });

  it("route handler は写さない", () => {
    expect(toSpecDir("src/app/api/health/route.ts")).toBeNull();
  });

  it("`src/app` の外は写さない", () => {
    expect(toSpecDir("src/features/resources/page.tsx")).toBeNull();
  });
});

describe("toScreenSpecPath", () => {
  // ----- 正常系 -----
  it("page は `page.screen.md` を要求する", () => {
    expect(toScreenSpecPath("src/app/(group)/resources/page.tsx")).toBe(
      `${SPEC_ROOT}/group/resources/page.screen.md`,
    );
  });

  it("layout は `layout.screen.md` を要求する", () => {
    expect(toScreenSpecPath("src/app/(group)/layout.tsx")).toBe(
      `${SPEC_ROOT}/group/layout.screen.md`,
    );
  });

  // ----- 異常系 -----
  it("入口でなければ null を返す", () => {
    expect(toScreenSpecPath("src/app/(group)/loading.tsx")).toBeNull();
  });
});

describe("findMissingScreenSpecs", () => {
  // ----- 正常系 -----
  it("画面要件が揃っていれば空にする", () => {
    expect(
      findMissingScreenSpecs(
        ["src/app/(group)/resources/page.tsx"],
        [`${SPEC_ROOT}/group/resources/page.screen.md`],
      ),
    ).toEqual([]);
  });

  it("機能要件の不在は挙げない", () => {
    expect(
      findMissingScreenSpecs(
        ["src/app/(group)/resources/page.tsx"],
        [`${SPEC_ROOT}/group/resources/page.screen.md`],
      ),
    ).toEqual([]);
  });

  // ----- 異常系 -----
  it("画面要件を持たない入口を挙げる", () => {
    expect(findMissingScreenSpecs(["src/app/(group)/resources/page.tsx"], [])).toEqual([
      "src/app/(group)/resources/page.tsx",
    ]);
  });

  it("入口でないファイルは母数に数えない", () => {
    expect(findMissingScreenSpecs(["src/app/(group)/resources/error.tsx"], [])).toEqual([]);
  });
});

describe("findOrphanSpecs", () => {
  // ----- 正常系 -----
  it("route が在る仕様書は挙げない", () => {
    expect(
      findOrphanSpecs(
        ["src/app/(group)/resources/page.tsx"],
        [
          `${SPEC_ROOT}/group/resources/page.screen.md`,
          `${SPEC_ROOT}/group/resources/page.function.md`,
        ],
      ),
    ).toEqual([]);
  });

  // ----- 異常系 -----
  it("route が消えた仕様書を挙げる", () => {
    expect(findOrphanSpecs([], [`${SPEC_ROOT}/group/resources/page.screen.md`])).toEqual([
      `${SPEC_ROOT}/group/resources/page.screen.md`,
    ]);
  });

  it("layout だけが在る階層の仕様書は孤児にしない", () => {
    expect(
      findOrphanSpecs(["src/app/(group)/layout.tsx"], [`${SPEC_ROOT}/group/layout.screen.md`]),
    ).toEqual([]);
  });
});

describe("NO_ROUTES_MESSAGE", () => {
  // ----- 正常系 -----
  it("母数が 0 件になった理由を述べる", () => {
    expect(NO_ROUTES_MESSAGE).toContain("1 件もありません");
  });
});

describe("SPEC_ROOT", () => {
  // ----- 正常系 -----
  it("仕様書の置き場を指す", () => {
    expect(SPEC_ROOT).toBe("docs/spec/route");
  });
});
