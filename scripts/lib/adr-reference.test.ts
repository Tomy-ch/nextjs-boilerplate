import { describe, expect, it } from "vitest";

import { findSectionedAdrReferences, formatSectionedAdrReferences } from "./adr-reference";

describe("findSectionedAdrReferences", () => {
  // ----- 正常系 -----
  it("節番号を伴わないリンクは挙げない", () => {
    const found = findSectionedAdrReferences(
      "docs/x.md",
      "根拠は [0010](0010-standards-and-non-lockin.md) が持つ。",
    );

    expect(found).toEqual([]);
  });

  it("節記号つきの番号を、綴りごと挙げる", () => {
    const found = findSectionedAdrReferences(
      "docs/x.md",
      "根拠は [0010](0010-standards-and-non-lockin.md) §2 が持つ。",
    );

    expect(found).toEqual([
      { file: "docs/x.md", line: 1, text: "](0010-standards-and-non-lockin.md) §2" },
    ]);
  });

  it("「決定 N」の形も、その綴りで挙げる", () => {
    const found = findSectionedAdrReferences(
      "docs/x.md",
      "手順は [0140](0140-documentation-operations.md) 決定 4 が持つ。",
    );

    expect(found.map(({ text }) => text)).toEqual(["](0140-documentation-operations.md) 決定 4"]);
  });

  it("節記号を伴わない裸の番号も、その綴りで挙げる", () => {
    const found = findSectionedAdrReferences(
      "docs/x.md",
      "検疫は [0110](0110-security-operations.md) 1.1 に従う。",
    );

    expect(found.map(({ text }) => text)).toEqual(["](0110-security-operations.md) 1.1"]);
  });

  it("相対パスのリンクでも挙げる", () => {
    const found = findSectionedAdrReferences(
      "docs/design/x.md",
      "段の境界は [0051](../adr/0051-styling-system.md) §2 が持つ。",
    );

    expect(found.map(({ text }) => text)).toEqual(["](../adr/0051-styling-system.md) §2"]);
  });

  it("節番号のあとに節題が続く形も挙げる", () => {
    const found = findSectionedAdrReferences(
      "docs/playbook.md",
      "| [0029](adr/0029-type-design-discipline.md) § 1. 状態は判別可能 union で表す |",
    );

    expect(found.map(({ text }) => text)).toEqual(["](adr/0029-type-design-discipline.md) § 1"]);
  });

  it("行番号は 1 起点で返す", () => {
    const found = findSectionedAdrReferences(
      "docs/x.md",
      ["一行目", "二行目 [0010](0010-standards-and-non-lockin.md) §1"].join("\n"),
    );

    expect(found.map(({ line }) => line)).toEqual([2]);
  });

  it("同じ行に 2 件あれば、両方を別々に挙げる", () => {
    const found = findSectionedAdrReferences(
      "docs/x.md",
      "[0010](0010-standards-and-non-lockin.md) §1 と [0011](0011-no-docker.md) §2",
    );

    expect(found.map(({ text }) => text)).toEqual([
      "](0010-standards-and-non-lockin.md) §1",
      "](0011-no-docker.md) §2",
    ]);
  });

  // ----- 異常系・境界値 -----
  it("助数詞が続く数は件数なので挙げない", () => {
    const found = findSectionedAdrReferences(
      "docs/x.md",
      "[0011](0011-no-docker.md) 1 つの理由でそうしている。",
    );

    expect(found).toEqual([]);
  });

  it("ADR でないリンクの直後の番号は挙げない", () => {
    const found = findSectionedAdrReferences(
      "docs/x.md",
      "[手順](../get-started/setup-repository.md) 6 を先に読む。",
    );

    expect(found).toEqual([]);
  });

  it("番号の前に語が挟まれば、節を指していないので挙げない", () => {
    const found = findSectionedAdrReferences(
      "docs/x.md",
      "[0010](0010-standards-and-non-lockin.md) の 2 原則に沿う。",
    );

    expect(found).toEqual([]);
  });
});

describe("formatSectionedAdrReferences", () => {
  // ----- 正常系 -----
  it("違反が無ければ空文字を返す", () => {
    expect(formatSectionedAdrReferences([])).toBe("");
  });

  it("位置と検出した綴りと、採るべき形を載せる", () => {
    const message = formatSectionedAdrReferences([
      { file: "docs/x.md", line: 7, text: "](0010-standards-and-non-lockin.md) §2" },
    ]);

    expect(message).toContain("docs/x.md:7");
    expect(message).toContain("§2");
    expect(message).toContain("[NNNN](path)");
  });

  it("複数件を、件ごとに 1 行で連ねる", () => {
    const message = formatSectionedAdrReferences([
      { file: "docs/a.md", line: 1, text: "](0001-a.md) §1" },
      { file: "docs/b.md", line: 2, text: "](0002-b.md) §2" },
    ]);

    expect(message.split("\n").map((line) => line.split(":").slice(0, 2).join(":"))).toEqual([
      "docs/a.md:1",
      "docs/b.md:2",
    ]);
  });
});
