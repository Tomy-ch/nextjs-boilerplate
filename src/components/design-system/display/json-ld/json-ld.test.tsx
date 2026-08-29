// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { JsonLd, toJsonLdScriptContent } from "./json-ld";

const DATA = { "@context": "https://schema.org", "@type": "Organization", name: "Acme" };

describe("JsonLd", () => {
  it("構造化データを ld+json の script として置く", () => {
    const { container } = render(<JsonLd data={DATA} />);

    const script = container.querySelector('script[type="application/ld+json"]');

    expect(script).not.toBeNull();
    expect(JSON.parse(script?.textContent ?? "")).toEqual(DATA);
  });

  it("script 以外の要素を置かない", () => {
    const { container } = render(<JsonLd data={DATA} />);

    expect(container.querySelectorAll(":not(script)")).toHaveLength(0);
  });

  it("a11y 違反を持たない", async () => {
    const { container } = render(<JsonLd data={DATA} />);

    expect((await axe(container)).violations).toEqual([]);
  });
});

describe("toJsonLdScriptContent", () => {
  // ----- 正常系 -----
  it("JSON として読める文字列を返す", () => {
    expect(JSON.parse(toJsonLdScriptContent(DATA))).toEqual(DATA);
  });

  it("script を閉じる文字を逃がし、JSON としての値は変えない", () => {
    const content = toJsonLdScriptContent({ name: "</script><img src=x>" });

    expect(content).not.toContain("<");
    expect(JSON.parse(content)).toEqual({ name: "</script><img src=x>" });
  });
});
