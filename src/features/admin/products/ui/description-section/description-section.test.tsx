// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { ProductDescriptionSection } from "./description-section";

// 編集面は `next/dynamic` で読まれる。先に解決しておかないと、要素を待つ時間の中に module の
// 読み込みが入る（`docs/testing-conventions.md`「`next/dynamic` を含む木を描くとき」）。
beforeAll(async () => {
  await import("@/components/design-system/rich-text/rich-text-editor/rich-text-editor");
});

const noop = () => {};

describe("ProductDescriptionSection", () => {
  it("書式付きの本文を書く面として公開する", async () => {
    render(
      <ProductDescriptionSection
        active={true}
        idPrefix="form"
        initialValue=""
        onValueChange={noop}
        value=""
      />,
    );

    expect(await screen.findByRole("textbox", { name: "商品説明" })).toBeInTheDocument();
  });

  it("保存済みの本文を開いた時点の内容として渡す", async () => {
    render(
      <ProductDescriptionSection
        active={true}
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
        active={true}
        idPrefix="form"
        initialValue=""
        onValueChange={noop}
        value="<p>いま</p>"
      />,
    );

    expect(container.querySelector('input[name="description"]')).toHaveValue("<p>いま</p>");
  });

  it("本文が空でも送信の欄そのものは残す", () => {
    const { container } = render(
      <ProductDescriptionSection
        active={true}
        idPrefix="form"
        initialValue=""
        onValueChange={noop}
        value=""
      />,
    );

    expect(container.querySelector('input[name="description"]')).toHaveValue("");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(
      <ProductDescriptionSection
        active={true}
        idPrefix="form"
        initialValue=""
        onValueChange={noop}
        value=""
      />,
    );

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
