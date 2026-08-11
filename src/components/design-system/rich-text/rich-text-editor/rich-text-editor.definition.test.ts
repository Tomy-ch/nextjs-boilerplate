import { describe, expect, it } from "vitest";

import { isRichTextHrefAllowed } from "./rich-text-editor.definition";

describe("isRichTextHrefAllowed", () => {
  // ----- 正常系 -----
  it("allowlist の protocol を持つ URL を通す", () => {
    expect(isRichTextHrefAllowed("https://example.com")).toBe(true);
    expect(isRichTextHrefAllowed("http://example.com")).toBe(true);
    expect(isRichTextHrefAllowed("mailto:info@example.com")).toBe(true);
  });

  it("外部ホストへ解決される protocol-relative な URL を落とす", () => {
    expect(isRichTextHrefAllowed("//attacker.example.com")).toBe(false);
  });

  it("protocol を持たない URL を通す", () => {
    expect(isRichTextHrefAllowed("/products/1")).toBe(true);
    expect(isRichTextHrefAllowed("#section")).toBe(true);
    expect(isRichTextHrefAllowed("?q=10:00")).toBe(true);
    expect(isRichTextHrefAllowed("products#10:00")).toBe(true);
  });

  it("allowlist 外の protocol を通さない", () => {
    expect(isRichTextHrefAllowed("javascript:alert(1)")).toBe(false);
    expect(isRichTextHrefAllowed("data:text/html,<script>alert(1)</script>")).toBe(false);
    expect(isRichTextHrefAllowed("tel:0000")).toBe(false);
  });
});
