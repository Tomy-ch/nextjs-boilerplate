import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { scanSuppressions } from "./scan";

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "suppression-expiry-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function place(relativePath: string, contents: string): void {
  const absolute = join(root, relativePath);

  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, contents);
}

describe("scanSuppressions", () => {
  // ----- 正常系 -----
  it("脆弱性 ID の抑止を、理由に添えられた条件ごと読む", () => {
    place(
      "osv-scanner.toml",
      '[[IgnoredVulns]]\nid = "GHSA-1111-1111-1111"\nreason = "2026-08-02 以降に削除する。"\n',
    );

    expect(scanSuppressions(root)).toEqual([
      {
        source: "osv-scanner.toml",
        subject: "GHSA-1111-1111-1111",
        condition: "2026-08-02 以降に削除する。",
      },
    ]);
  });

  it("冷却期間の例外を、行に添えられた条件ごと読む", () => {
    place(
      "pnpm-workspace.yaml",
      "minimumReleaseAge: 10080\nminimumReleaseAgeExclude:\n  - pkg@1.2.3 # 2026-08-02 以降に削除する\nminimumReleaseAgeStrict: true\n",
    );

    expect(scanSuppressions(root)).toEqual([
      {
        source: "pnpm-workspace.yaml",
        subject: "pkg@1.2.3",
        condition: "2026-08-02 以降に削除する",
      },
    ]);
  });

  it("動的スキャンの抑止を、規則番号と理由の組で読む", () => {
    place(".github/zap/rules.tsv", "# 解説の行\n10055\tIGNORE\t既知の弱い許可。\n");

    expect(scanSuppressions(root)).toEqual([
      { source: ".github/zap/rules.tsv", subject: "10055", condition: "既知の弱い許可。" },
    ]);
  });

  it("3 つの面を 1 つの一覧へ均す", () => {
    place("osv-scanner.toml", '[[IgnoredVulns]]\nid = "GHSA-1"\nreason = "理由"\n');
    place("pnpm-workspace.yaml", "minimumReleaseAgeExclude:\n  - pkg@1.0.0 # 理由\n");
    place(".github/zap/rules.tsv", "10055\tIGNORE\t理由\n");

    expect(scanSuppressions(root).map((entry) => entry.source)).toEqual([
      "osv-scanner.toml",
      "pnpm-workspace.yaml",
      ".github/zap/rules.tsv",
    ]);
  });

  it("例外の一覧が空なら、続く設定を宣言として読まない", () => {
    place("pnpm-workspace.yaml", "minimumReleaseAgeExclude: []\nminimumReleaseAgeStrict: true\n");

    expect(scanSuppressions(root)).toEqual([]);
  });

  // ----- 異常系 -----
  it("理由を持たない脆弱性の抑止も、条件を空にして一覧へ載せる", () => {
    // 読み飛ばすと、条件を持たない抑止だけが一覧から消え、いちばん確かめたいものが見えなくなる。
    place("osv-scanner.toml", '[[IgnoredVulns]]\nid = "GHSA-2222-2222-2222"\n');

    expect(scanSuppressions(root)).toEqual([
      { source: "osv-scanner.toml", subject: "GHSA-2222-2222-2222", condition: "" },
    ]);
  });

  it("理由を持たない冷却期間の例外も、条件を空にして一覧へ載せる", () => {
    place("pnpm-workspace.yaml", "minimumReleaseAgeExclude:\n  - pkg@1.2.3\n");

    expect(scanSuppressions(root)).toEqual([
      { source: "pnpm-workspace.yaml", subject: "pkg@1.2.3", condition: "" },
    ]);
  });

  it("理由の列を持たない動的スキャンの抑止も、条件を空にして一覧へ載せる", () => {
    place(".github/zap/rules.tsv", "10055\tIGNORE\n");

    expect(scanSuppressions(root)).toEqual([
      { source: ".github/zap/rules.tsv", subject: "10055", condition: "" },
    ]);
  });

  it("名前を持たない宣言は落とす。何を確かめるか決められない", () => {
    place("osv-scanner.toml", '[[IgnoredVulns]]\nid = ""\nreason = "理由"\n');
    place("pnpm-workspace.yaml", "minimumReleaseAgeExclude:\n  - # 理由\n");
    place(".github/zap/rules.tsv", "\tIGNORE\t理由\n");

    expect(scanSuppressions(root)).toEqual([]);
  });

  it("値が閉じていなければ、その項目を空として読む", () => {
    place("osv-scanner.toml", '[[IgnoredVulns]]\nid = "GHSA-3"\nreason = "閉じ忘れ\n');

    expect(scanSuppressions(root)).toEqual([
      { source: "osv-scanner.toml", subject: "GHSA-3", condition: "" },
    ]);
  });

  it("列を 1 つも持たない行は、規則番号だけの宣言として読む", () => {
    place(".github/zap/rules.tsv", "10055\n");

    expect(scanSuppressions(root)).toEqual([
      { source: ".github/zap/rules.tsv", subject: "10055", condition: "" },
    ]);
  });

  it("根を渡さなければ、自分が置かれているリポジトリを読む", () => {
    // 既定の根は入口だけが使う。ここで踏まないと、実行される経路が検査の外に残る。
    expect(scanSuppressions().length).toBeGreaterThan(0);
  });

  it("面が 1 つも無ければ空を返す", () => {
    expect(scanSuppressions(root)).toEqual([]);
  });

  it("例外の宣言そのものが無ければ、その面から何も読まない", () => {
    place("pnpm-workspace.yaml", "minimumReleaseAge: 10080\n");

    expect(scanSuppressions(root)).toEqual([]);
  });
});
