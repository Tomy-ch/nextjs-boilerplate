import type { Element } from "hast";
import { describe, expect, it } from "vitest";

import { mermaidSourceOf } from "./mermaid-source";

function pre(children: Element["children"]): Element {
  return { type: "element", tagName: "pre", properties: {}, children };
}

function code(className: unknown, text: string): Element {
  return {
    type: "element",
    tagName: "code",
    properties: { className } as Element["properties"],
    children: [{ type: "text", value: text }],
  };
}

describe("mermaidSourceOf", () => {
  // ----- 正常系 -----
  it("mermaid のフェンスから原文を取り出す", () => {
    expect(mermaidSourceOf(pre([code(["language-mermaid"], "flowchart TD\n  A --> B")]))).toBe(
      "flowchart TD\n  A --> B",
    );
  });

  it("class を文字列で持つ木からも取り出す", () => {
    expect(mermaidSourceOf(pre([code("language-mermaid", "graph LR")]))).toBe("graph LR");
  });

  it("class を複数持っていても取り出す", () => {
    expect(mermaidSourceOf(pre([code(["hljs", "language-mermaid"], "graph LR")]))).toBe("graph LR");
  });

  it("入れ子になった要素の文字列も連結する", () => {
    const nested = code(["language-mermaid"], "");
    nested.children = [
      { type: "text", value: "graph " },
      {
        type: "element",
        tagName: "span",
        properties: {},
        children: [{ type: "text", value: "LR" }],
      },
    ];

    expect(mermaidSourceOf(pre([nested]))).toBe("graph LR");
  });

  it("文字列を持たないノードを飛ばして連結する", () => {
    const withComment = code(["language-mermaid"], "");
    withComment.children = [
      { type: "comment", value: "註" },
      { type: "text", value: "graph LR" },
    ];

    expect(mermaidSourceOf(pre([withComment]))).toBe("graph LR");
  });

  // ----- 異常系 -----
  it("別の言語のコードブロックを図にしない", () => {
    expect(mermaidSourceOf(pre([code(["language-ts"], "const a = 1;")]))).toBeUndefined();
  });

  it("class を持たないコードブロックを図にしない", () => {
    expect(mermaidSourceOf(pre([code(undefined, "текст")]))).toBeUndefined();
  });

  it("pre でない要素を図にしない", () => {
    const node = pre([code(["language-mermaid"], "graph LR")]);
    node.tagName = "div";

    expect(mermaidSourceOf(node)).toBeUndefined();
  });

  it("code を包んでいない pre を図にしない", () => {
    expect(
      mermaidSourceOf(pre([{ type: "element", tagName: "span", properties: {}, children: [] }])),
    ).toBeUndefined();
  });

  it("子が 1 つでない pre を図にしない", () => {
    expect(
      mermaidSourceOf(
        pre([code(["language-mermaid"], "graph LR"), code(["language-mermaid"], "graph TD")]),
      ),
    ).toBeUndefined();
  });

  it("子を持たない pre を図にしない", () => {
    expect(mermaidSourceOf(pre([]))).toBeUndefined();
  });

  it("テキストだけを子に持つ pre を図にしない", () => {
    expect(mermaidSourceOf(pre([{ type: "text", value: "graph LR" }]))).toBeUndefined();
  });
});
