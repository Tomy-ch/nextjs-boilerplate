import { describe, expect, it } from "vitest";

import { planReleaseTag, releaseNotesPath } from "./tag";

describe("releaseNotesPath", () => {
  // ----- 正常系 -----
  it("版から .github/release の下のパスを作る", () => {
    expect(releaseNotesPath("v1.3.0")).toBe(".github/release/v1.3.0.md");
  });
});

describe("planReleaseTag", () => {
  // ----- 正常系 -----
  it("次の版のリリースノートを参照先に取る", () => {
    expect(planReleaseTag({ latest: "v1.2.3", next: "v1.3.0" }).notesPath).toBe(
      ".github/release/v1.3.0.md",
    );
  });

  it("production を origin の先端へ戻してからタグを取り込む", () => {
    const plan = planReleaseTag({ latest: "v1.2.3", next: "v1.3.0" });

    expect(plan.preparation).toEqual([
      { kind: "log", message: "🔄 productionブランチの最新を取得中..." },
      { kind: "run", command: "git", args: ["fetch", "origin", "production"] },
      { kind: "run", command: "git", args: ["switch", "production"] },
      { kind: "run", command: "git", args: ["reset", "--hard", "origin/production"] },
      { kind: "log", message: "✅ 最新のproductionを取得完了" },
      { kind: "log", message: "🔄 最新のタグを取得中..." },
      { kind: "run", command: "git", args: ["fetch", "--tags", "origin"] },
      { kind: "log", message: "✅ 最新のタグを取得完了" },
      { kind: "log", message: "🔖 タグから最新タグバージョンを取得: v1.2.3" },
      { kind: "log", message: "➡️ 次のリリースバージョンを作成: v1.3.0" },
    ]);
  });

  it("同じリリースノートをタグの注釈と Release の本文に使う", () => {
    const plan = planReleaseTag({ latest: "v1.2.3", next: "v1.3.0" });

    expect(plan.steps).toEqual([
      {
        kind: "run",
        command: "git",
        args: ["tag", "-a", "v1.3.0", "-F", ".github/release/v1.3.0.md"],
      },
      { kind: "run", command: "git", args: ["push", "origin", "v1.3.0"] },
      {
        kind: "run",
        command: "gh",
        args: [
          "release",
          "create",
          "v1.3.0",
          "--title",
          "v1.3.0",
          "--notes-file",
          ".github/release/v1.3.0.md",
        ],
      },
      { kind: "log", message: "✅ タグを打ちました v1.3.0 on production HEAD" },
    ]);
  });

  it("リリースノートが無いときに出す行を持つ", () => {
    const plan = planReleaseTag({ latest: "v1.2.3", next: "v1.3.0" });

    expect(plan.missingNotes).toEqual([
      {
        kind: "log",
        message: "❌ .github/release/v1.3.0.md が存在しません。タグとリリースをスキップしました。",
      },
    ]);
  });
});
