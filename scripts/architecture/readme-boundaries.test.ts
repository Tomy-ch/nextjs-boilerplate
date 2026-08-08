import { describe, expect, it } from "vitest";

import { findBoundaryDrift, parseBoundaryFrontmatter } from "./readme-boundaries";

describe("parseBoundaryFrontmatter", () => {
  // ----- 正常系 -----
  it("frontmatter から境界宣言を取り出す", () => {
    const source = [
      "---",
      "imports-allowed: [model, errors]",
      "forbidden: [fetch, config]",
      "test-requirement: component",
      "---",
      "",
      "# components",
    ].join("\n");

    expect(parseBoundaryFrontmatter(source)).toEqual({
      "imports-allowed": ["model", "errors"],
      forbidden: ["fetch", "config"],
    });
  });

  it("本文を持たない README の frontmatter も読む", () => {
    const source = "---\nimports-allowed: []\nforbidden: []\n---";

    expect(parseBoundaryFrontmatter(source)).toEqual({
      "imports-allowed": [],
      forbidden: [],
    });
  });

  it("改行が CRLF の README も読む", () => {
    const source = "---\r\nimports-allowed: [errors]\r\nforbidden: [fetch]\r\n---\r\n\r\n# model";

    expect(parseBoundaryFrontmatter(source)).toEqual({
      "imports-allowed": ["errors"],
      forbidden: ["fetch"],
    });
  });
  // ----- 異常系 -----
  it("frontmatter が無い README を拒否する", () => {
    expect(() => parseBoundaryFrontmatter("# components\n")).toThrow("frontmatter");
  });

  it("境界のキーを欠く frontmatter を拒否する", () => {
    expect(() => parseBoundaryFrontmatter("---\ntest-requirement: unit\n---\n")).toThrow();
  });

  it("配列でない imports-allowed を拒否する", () => {
    expect(() =>
      parseBoundaryFrontmatter("---\nimports-allowed: model\nforbidden: []\n---\n"),
    ).toThrow();
  });
});

describe("findBoundaryDrift", () => {
  // ----- 正常系 -----
  it("宣言が architecture.ts と一致していれば差分を返さない", () => {
    expect(
      findBoundaryDrift("components", {
        "imports-allowed": ["model", "errors"],
        forbidden: ["fetch", "config", "capabilities"],
      }),
    ).toEqual([]);
  });

  it("並び順の違いを差分として扱わない", () => {
    expect(
      findBoundaryDrift("components", {
        "imports-allowed": ["errors", "model"],
        forbidden: [],
      }),
    ).toEqual([]);
  });

  it("何も import できない層の空宣言を通す", () => {
    expect(
      findBoundaryDrift("errors", {
        "imports-allowed": [],
        forbidden: ["http-vocabulary"],
      }),
    ).toEqual([]);
  });
  // ----- 異常系 -----
  it("architecture.ts が許す層の欠落を報告する", () => {
    expect(
      findBoundaryDrift("components", {
        "imports-allowed": ["model"],
        forbidden: [],
      }),
    ).toEqual(["imports-allowed に errors がありません"]);
  });

  it("architecture.ts が許していない層の混入を報告する", () => {
    expect(
      findBoundaryDrift("components", {
        "imports-allowed": ["model", "errors", "adapters"],
        forbidden: [],
      }),
    ).toEqual(["imports-allowed の adapters は architecture.ts が許していません"]);
  });

  it("許可と禁止の両方に挙がった層を報告する", () => {
    expect(
      findBoundaryDrift("components", {
        "imports-allowed": ["model", "errors"],
        forbidden: ["errors"],
      }),
    ).toEqual(["errors を許可と禁止の両方に挙げています"]);
  });

  it("層名でない禁止語彙を矛盾として扱わない", () => {
    expect(
      findBoundaryDrift("components", {
        "imports-allowed": ["model", "errors"],
        forbidden: ["fetch", "business-state"],
      }),
    ).toEqual([]);
  });
});
