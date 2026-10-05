import { describe, expect, it } from "vitest";

import { EXCLUDED_PATHS, isScanned, SCANNED_PATHS, scanRoots } from "./targets";

describe("SCANNED_PATHS", () => {
  // ----- 正常系 -----
  it("残る側の文書を並べている", () => {
    expect(SCANNED_PATHS).toContain("docs/adr");
    expect(SCANNED_PATHS).toContain("docs/rules.md");
    expect(SCANNED_PATHS).toContain("src");
    expect(SCANNED_PATHS).toContain("README.md");
  });

  // ----- 異常系 -----
  it("捨てられる側を走査の対象にしない", () => {
    expect(SCANNED_PATHS).not.toContain("docs/get-started");
    expect(SCANNED_PATHS).not.toContain("docs/plan");
  });

  it("翻訳のミラーを canonical と別に並べない", () => {
    expect(SCANNED_PATHS.filter((path) => path.endsWith(".ja.md"))).toEqual([]);
  });
});

describe("EXCLUDED_PATHS", () => {
  // ----- 正常系 -----
  it("除外に理由を持たせている", () => {
    for (const reason of Object.values(EXCLUDED_PATHS)) {
      expect(reason).not.toBe("");
    }
  });
});

describe("scanRoots", () => {
  // ----- 正常系 -----
  it("名指した文書の直後に、その翻訳のミラーを起点として足す", () => {
    const roots = scanRoots();

    expect(roots.indexOf("AGENTS.ja.md")).toBe(roots.indexOf("AGENTS.md") + 1);
    expect(roots).toContain("docs/rules.ja.md");
  });

  it("名指したディレクトリには起点を足さない", () => {
    expect(scanRoots().filter((root) => root.startsWith("docs/adr"))).toEqual(["docs/adr"]);
  });

  it("名指したパスをすべて起点に残す", () => {
    expect(scanRoots()).toEqual(expect.arrayContaining([...SCANNED_PATHS]));
  });

  it("起点はミラー 1 本につき 1 つだけ足す", () => {
    const documents = SCANNED_PATHS.filter((path) => path.endsWith(".md"));

    expect(scanRoots()).toHaveLength(SCANNED_PATHS.length + documents.length);
  });
});

describe("isScanned", () => {
  // ----- 正常系 -----
  it("残る文書を対象にする", () => {
    expect(isScanned("docs/adr/0011-no-docker.md")).toBe(true);
    expect(isScanned("docs/rules.md")).toBe(true);
    expect(isScanned("src/features/README.md")).toBe(true);
  });

  it("残る側のソースも対象にする", () => {
    expect(isScanned("src/model/session.ts")).toBe(true);
    expect(isScanned(".makefiles/testing/scripts.mk")).toBe(true);
    expect(isScanned(".github/workflows/test.yaml")).toBe(true);
  });

  // ----- 異常系 -----
  it("コメントを持てない形式を対象にしない", () => {
    expect(isScanned("package.json")).toBe(false);
    expect(isScanned(".github/settings/labels.json")).toBe(false);
  });

  it("名指した文書の翻訳のミラーも対象にする", () => {
    expect(isScanned("AGENTS.ja.md")).toBe(true);
    expect(isScanned("docs/rules.ja.md")).toBe(true);
    expect(isScanned("README.ja.md")).toBe(true);
  });

  it("名指したディレクトリの配下にあるミラーも対象にする", () => {
    expect(isScanned("docs/adr/0011-no-docker.ja.md")).toBe(true);
    expect(isScanned("src/features/README.ja.md")).toBe(true);
  });

  it("除外したパスを対象にしない", () => {
    expect(isScanned("docs/adr/BACKLOG.md")).toBe(false);
    expect(isScanned("docs/plan/v1-implementation-plan.md")).toBe(false);
    expect(isScanned("docs/get-started/setup-repository.md")).toBe(false);
  });

  it("除外した文書の翻訳のミラーも対象にしない", () => {
    expect(isScanned("docs/project/versioning.ja.md")).toBe(false);
    expect(isScanned("docs/adr/BACKLOG.ja.md")).toBe(false);
  });

  it("名指した文書と名前の前半だけが同じ文書をミラーとして扱わない", () => {
    expect(isScanned("docs/rules-extra.ja.md")).toBe(false);
    expect(isScanned("docs/project/versioning-notes.ja.md")).toBe(true);
  });

  it("名指した文書と同名でも、別の置き場のミラーは対象にしない", () => {
    expect(isScanned("tokens/README.ja.md")).toBe(false);
  });

  it("走査対象に入っていないパスを対象にしない", () => {
    expect(isScanned("tokens/theme.ts")).toBe(false);
    expect(isScanned("eslint-rules/no-foo.ts")).toBe(false);
  });
});
