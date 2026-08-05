import type { Element, Nodes, Root } from "hast";
import { describe, expect, it } from "vitest";

import { RICH_TEXT_TAG_NAMES } from "./rich-text.definition";
import { SanitizedRichText, toRichTextRoot } from "./sanitized-rich-text";

function elementsOf(node: Nodes): Element[] {
  if (node.type === "element") {
    return [node, ...node.children.flatMap(elementsOf)];
  }

  if (node.type === "root") {
    return node.children.flatMap(elementsOf);
  }

  return [];
}

function tagNamesOf(root: Root): string[] {
  return elementsOf(root).map((element) => element.tagName);
}

function firstElement(root: Root, tagName: string): Element | undefined {
  return elementsOf(root).find((element) => element.tagName === tagName);
}

function textOf(node: Nodes): string {
  if (node.type === "text") {
    return node.value;
  }

  if (node.type === "element" || node.type === "root") {
    return node.children.map(textOf).join("");
  }

  return "";
}

const allowedTagsHtml = [
  "<p>段落</p>",
  "<h2>見出し2</h2><h3>見出し3</h3><h4>見出し4</h4>",
  "<ul><li>箇条書き</li></ul><ol><li>番号付き</li></ol>",
  "<blockquote>引用</blockquote><hr>",
  "<p><strong>太字</strong><em>斜体</em><s>打ち消し</s><code>コード</code>",
  '<a href="https://example.com">リンク</a><br></p>',
].join("");

describe("allowlist 内", () => {
  it("通すと決めたタグをすべて残す", () => {
    const { root } = SanitizedRichText.from(allowedTagsHtml);

    expect(new Set(tagNamesOf(root))).toEqual(new Set(RICH_TEXT_TAG_NAMES));
  });

  it("a の href に http / https / mailto を残す", () => {
    const { root } = SanitizedRichText.from(
      [
        '<a href="http://example.com">平文</a>',
        '<a href="https://example.com">暗号化</a>',
        '<a href="mailto:someone@example.com">メール</a>',
      ].join(""),
    );

    expect(elementsOf(root).map((element) => element.properties.href)).toEqual([
      "http://example.com",
      "https://example.com",
      "mailto:someone@example.com",
    ]);
  });

  it("li を ul / ol の中でだけ残す", () => {
    const nested = SanitizedRichText.from("<ul><li>入れ子</li></ul>");
    const stray = SanitizedRichText.from("<li>単独</li>");

    expect(tagNamesOf(nested.root)).toEqual(["ul", "li"]);
    expect(tagNamesOf(stray.root)).toEqual([]);
    expect(textOf(stray.root)).toBe("単独");
  });
});

describe("allowlist 外", () => {
  it("h1 を落とす", () => {
    const { root } = SanitizedRichText.from("<h1>大見出し</h1>");

    expect(tagNamesOf(root)).toEqual([]);
  });

  it("script / iframe / style / object を落とす", () => {
    const { root } = SanitizedRichText.from(
      [
        "<script>alert(1)</script>",
        '<iframe src="https://example.com"></iframe>',
        "<style>body{color:red}</style>",
        '<object data="/malicious"></object>',
      ].join(""),
    );

    expect(tagNamesOf(root)).toEqual([]);
  });

  it("script / style の中身を本文へ残さない", () => {
    const { root } = SanitizedRichText.from(
      "<script>alert(1)</script><style>body{color:red}</style>",
    );

    expect(textOf(root)).toBe("");
  });
});

describe("属性", () => {
  it("イベントハンドラ属性を落とす", () => {
    const { root } = SanitizedRichText.from('<p onclick="steal()" onerror="steal()">本文</p>');

    expect(firstElement(root, "p")?.properties).toEqual({});
  });

  it("class / style / id を落とす", () => {
    const { root } = SanitizedRichText.from(
      '<p class="danger" style="position:fixed" id="overlay">本文</p>',
    );

    expect(firstElement(root, "p")?.properties).toEqual({});
  });

  it("href 以外の属性を a からも落とす", () => {
    const { root } = SanitizedRichText.from(
      '<a href="https://example.com" target="_blank" rel="opener">リンク</a>',
    );

    expect(firstElement(root, "a")?.properties).toEqual({ href: "https://example.com" });
  });
});

describe("href のプロトコル", () => {
  it("javascript: を落とす", () => {
    const { root } = SanitizedRichText.from('<a href="javascript:alert(1)">リンク</a>');

    expect(firstElement(root, "a")?.properties).toEqual({});
  });

  it("data:text/html を落とす", () => {
    const { root } = SanitizedRichText.from(
      '<a href="data:text/html,%3Cscript%3Ealert(1)%3C/script%3E">リンク</a>',
    );

    expect(firstElement(root, "a")?.properties).toEqual({});
  });
});

describe("parse", () => {
  it("不正な入れ子を例外にせず正規化する", () => {
    const parse = () => SanitizedRichText.from("<p><div>段落の中のブロック</div></p>");

    expect(parse).not.toThrow();
    expect(textOf(parse().root)).toBe("段落の中のブロック");
  });

  it("閉じていないタグを例外にしない", () => {
    const { root } = SanitizedRichText.from("<p>閉じ忘れ<strong>強調");

    expect(tagNamesOf(root)).toEqual(["p", "strong"]);
  });

  it("空文字から空の root を作る", () => {
    const { root } = SanitizedRichText.from("");

    expect(root.type).toBe("root");
    expect(root.children).toEqual([]);
  });

  it("HTML コメントを落とす", () => {
    const { root } = SanitizedRichText.from("<!-- 隠しコメント --><p>本文</p>");

    expect(textOf(root)).toBe("本文");
  });
});

describe("toRichTextRoot", () => {
  it("root ノードをそのまま返す", () => {
    const root: Root = { type: "root", children: [] };

    expect(toRichTextRoot(root)).toBe(root);
  });

  it("root 以外のノードを root の子として包む", () => {
    const text: Nodes = { type: "text", value: "本文" };

    expect(toRichTextRoot(text)).toEqual({ type: "root", children: [text] });
  });
});
