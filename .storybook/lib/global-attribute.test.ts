// @vitest-environment jsdom

import { describe, expect, it } from "vitest";

import { attributeValue, writeAttribute } from "./global-attribute";

describe("attributeValue", () => {
  // ----- 正常系 -----
  it("既定でない値は、そのまま属性へ書く値にする", () => {
    expect(attributeValue("dark", "system")).toBe("dark");
  });

  // ----- 異常系 -----
  it("既定の値を選んだら、属性を外す", () => {
    expect(attributeValue("system", "system")).toBeUndefined();
  });
});

describe("writeAttribute", () => {
  // ----- 正常系 -----
  it("値を属性へ書く", () => {
    const element = document.createElement("div");

    writeAttribute(element, "data-theme", "dark");

    expect(element.getAttribute("data-theme")).toBe("dark");
  });

  // ----- 異常系 -----
  it("値が無ければ、書いてあった属性を外す", () => {
    const element = document.createElement("div");
    element.setAttribute("data-theme", "dark");

    writeAttribute(element, "data-theme", undefined);

    expect(element.hasAttribute("data-theme")).toBe(false);
  });
});
