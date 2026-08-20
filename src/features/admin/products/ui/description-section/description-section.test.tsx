// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProductDescriptionSection } from "./description-section";

const noop = () => {};

describe("ProductDescriptionSection", () => {
  // ----- 正常系 -----
  it("書式付きの本文を書く面として公開する", async () => {
    render(
      <ProductDescriptionSection idPrefix="form" initialValue="" onValueChange={noop} value="" />,
    );

    expect(await screen.findByRole("textbox", { name: "商品説明" })).toBeInTheDocument();
  });

  it("保存済みの本文を開いた時点の内容として渡す", async () => {
    render(
      <ProductDescriptionSection
        idPrefix="form"
        initialValue="<p>保存済み</p>"
        onValueChange={noop}
        value="<p>保存済み</p>"
      />,
    );

    expect(await screen.findByRole("textbox", { name: "商品説明" })).toHaveTextContent("保存済み");
  });

  it("書いた内容を送信へ載せる。編集面は form の値を持たないため", () => {
    const { container } = render(
      <ProductDescriptionSection
        idPrefix="form"
        initialValue=""
        onValueChange={noop}
        value="<p>いま</p>"
      />,
    );

    expect(container.querySelector('input[name="description"]')).toHaveValue("<p>いま</p>");
  });

  // ----- 異常系 -----
  it("本文が空でも送信の欄そのものは残す", () => {
    const { container } = render(
      <ProductDescriptionSection idPrefix="form" initialValue="" onValueChange={noop} value="" />,
    );

    expect(container.querySelector('input[name="description"]')).toHaveValue("");
  });
});
