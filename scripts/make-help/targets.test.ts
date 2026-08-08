import { describe, expect, it } from "vitest";

import { buildTargetListing, LISTING_HEADER, type MakefileSource } from "./targets";

const source = (content: string, file = ".makefiles/sample.mk"): MakefileSource => ({
  file,
  content,
});

describe("LISTING_HEADER", () => {
  // ----- 正常系 -----
  it("一覧の見出しを 2 行で持つ", () => {
    expect(LISTING_HEADER).toHaveLength(2);
    expect(LISTING_HEADER[0]).toContain("Makeターゲット一覧");
  });
});

describe("buildTargetListing", () => {
  // ----- 正常系 -----
  it("説明コメント付きの .PHONY をターゲットと説明の行にする", () => {
    const { lines } = buildTargetListing([source(".PHONY: test ## テストを実行する\n")]);

    expect(lines.at(-1)).toBe(`🛠  ${"test".padEnd(24)} テストを実行する`);
  });

  it("1 行に並べた複数ターゲットを、同じ説明で全件並べる", () => {
    const { lines } = buildTargetListing([source(".PHONY: a b ## 説明\n")]);

    expect(lines.slice(-2).map((line) => line.trim().split(/\s+/)[1])).toEqual(["a", "b"]);
  });

  it("カテゴリ見出しを空行つきで挟む", () => {
    const { lines } = buildTargetListing([source("## テスト\n.PHONY: test ## 実行する\n")]);

    expect(lines[2]).toBe("");
    expect(lines[3]).toBe("📂 テスト");
  });

  it("複数の .mk を渡された順に並べる", () => {
    const { lines } = buildTargetListing([
      source(".PHONY: first ## 先\n", "a.mk"),
      source(".PHONY: second ## 後\n", "b.mk"),
    ]);

    expect(lines.at(-2)).toContain("first");
    expect(lines.at(-1)).toContain("second");
  });

  // ----- 異常系 -----
  it("説明コメントを持たない .PHONY を一覧へ出さず、位置つきで別に返す", () => {
    const { lines, undocumented } = buildTargetListing([source(".PHONY: hidden\n")]);

    expect(lines).toEqual(LISTING_HEADER);
    expect(undocumented).toEqual([".makefiles/sample.mk: .PHONY: hidden"]);
  });

  it("ターゲットが無ければ見出しだけを返す", () => {
    const { lines, undocumented } = buildTargetListing([source("# ただのコメント\n")]);

    expect(lines).toEqual(LISTING_HEADER);
    expect(undocumented).toEqual([]);
  });
});
