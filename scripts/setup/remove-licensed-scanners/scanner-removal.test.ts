import { describe, expect, it } from "vitest";

import {
  findMentions,
  isPinReferenced,
  MalformedHeadingError,
  MissingDeclarationError,
  removeSection,
  replaceExact,
  repoOf,
} from "./scanner-removal";

describe("MissingDeclarationError", () => {
  // ----- 正常系 -----
  it("どのファイルの何が見つからなかったかを文面に持つ", () => {
    const error = new MissingDeclarationError("SECURITY.md", "語句", "SonarQube Cloud");

    expect(error.name).toBe("MissingDeclarationError");
    expect(error.message).toContain("SECURITY.md");
    expect(error.message).toContain("語句");
    expect(error.message).toContain("SonarQube Cloud");
  });
});

describe("MalformedHeadingError", () => {
  // ----- 正常系 -----
  it("どのファイルのどの宣言が見出しでなかったかを文面に持つ", () => {
    const error = new MalformedHeadingError("SECURITY.md", "SonarQube Cloud のライセンス");

    expect(error.name).toBe("MalformedHeadingError");
    expect(error.message).toContain("SECURITY.md");
    expect(error.message).toContain("SonarQube Cloud のライセンス");
  });
});

describe("replaceExact", () => {
  // ----- 正常系 -----
  it("完全一致した箇所を置換後の語句へ差し替える", () => {
    expect(
      replaceExact("codeql / sonarcloud", "codeql / sonarcloud", "sonarcloud", "f.md", "語句"),
    ).toBe("sonarcloud");
  });

  it("置換後が空なら取り除く", () => {
    expect(replaceExact("a + b + c", " + b", "", "f.md", "語句")).toBe("a + c");
  });

  it("同じ語句が複数あっても最初の 1 箇所だけを差し替える", () => {
    expect(replaceExact("x,x,", "x,", "", "f.md", "語句")).toBe("x,");
  });

  // ----- 異常系 -----
  it("一致が無ければ投げる（動いた行を黙って素通りさせない）", () => {
    expect(() => replaceExact("abc", "zzz", "", "f.md", "語句")).toThrow(MissingDeclarationError);
  });
});

describe("removeSection", () => {
  const doc = [
    "## 見出し A",
    "",
    "本文 A",
    "",
    "### 対象",
    "",
    "消える本文",
    "",
    "### 次",
    "",
    "残る本文",
    "",
  ].join("\n");

  // ----- 正常系 -----
  it("見出しと本文を、次の同レベルの見出しの手前まで落とす", () => {
    const result = removeSection(doc, "### 対象", "f.md");

    expect(result).not.toContain("消える本文");
    expect(result).toContain("### 次");
    expect(result).toContain("残る本文");
  });

  it("上位レベルの見出しでも境界として止まる", () => {
    const nested = ["### 対象", "", "消える", "", "## 上位", "", "残る", ""].join("\n");

    expect(removeSection(nested, "### 対象", "f.md")).toContain("## 上位");
  });

  it("最後の節なら本文の終端までを落とす", () => {
    const tail = ["## A", "", "本文", "", "### 対象", "", "消える", ""].join("\n");
    const result = removeSection(tail, "### 対象", "f.md");

    expect(result).not.toContain("消える");
    expect(result).toContain("本文");
  });

  it("見出しの手前の空行を残し、隣り合う 2 節を続けて消しても区切りが尽きない", () => {
    const adjacent = ["本文", "", "### A", "", "a", "", "### B", "", "b", "", "### C", ""].join(
      "\n",
    );
    const result = removeSection(removeSection(adjacent, "### A", "f.md"), "### B", "f.md");

    expect(result).toBe(["本文", "", "### C", ""].join("\n"));
  });

  // ----- 異常系 -----
  it("見出しが無ければ投げる", () => {
    expect(() => removeSection(doc, "### 無い", "f.md")).toThrow(MissingDeclarationError);
  });

  it("見出しの形をしていない宣言は、同じ行が本文にあっても投げる", () => {
    expect(() => removeSection(doc, "本文 A", "f.md")).toThrow(MalformedHeadingError);
  });

  it("# の後ろに空白が無い宣言も投げる", () => {
    expect(() => removeSection("###対象\n\n消える\n", "###対象", "f.md")).toThrow(
      MalformedHeadingError,
    );
  });
});

describe("repoOf", () => {
  // ----- 正常系 -----
  it("版を外して owner/repo を返す", () => {
    expect(repoOf("github/codeql-action@v4.37.6")).toBe("github/codeql-action");
  });

  it("版を持たないキーはそのまま返す", () => {
    expect(repoOf("github/codeql-action")).toBe("github/codeql-action");
  });
});

describe("isPinReferenced", () => {
  // ----- 正常系 -----
  it("残る workflow がサブパス付きで使っていれば参照とみなす", () => {
    const surviving = ["    - uses: github/codeql-action/upload-sarif@v4.37.6"];

    expect(isPinReferenced("github/codeql-action@v4.37.6", surviving)).toBe(true);
  });

  // ----- 異常系 -----
  it("どの workflow も使っていなければ孤児とみなす", () => {
    const surviving = ["    - uses: actions/checkout@v7.0.0"];

    expect(isPinReferenced("SonarSource/sonarqube-scan-action@v8.2.1", surviving)).toBe(false);
  });

  it("名前が前方一致するだけの action を参照とみなさない", () => {
    expect(isPinReferenced("actions/cache", ["    - uses: actions/checkout@v7.0.0"])).toBe(false);
  });
});

describe("findMentions", () => {
  // ----- 正常系 -----
  it("綴りを含む行を、行番号つきで挙げる", () => {
    const content = ["# 見出し", "CodeQL の層", "無関係な行"].join("\n");

    expect(findMentions("docs/x.md", content, ["CodeQL"])).toEqual([
      { file: "docs/x.md", line: 2, text: "CodeQL の層" },
    ]);
  });

  it("同じ行が複数の綴りに当たっても 1 件で返す", () => {
    const found = findMentions("docs/x.md", "CodeQL と codeql", ["CodeQL", "codeql"]);

    expect(found).toHaveLength(1);
  });

  // ----- 異常系 -----
  it("綴りが無ければ 0 件を返す", () => {
    expect(findMentions("docs/x.md", "何も無い", ["CodeQL"])).toEqual([]);
  });
});
