// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { controlIdOf } from "../../form-sections";
import { ProductDescriptionEditor } from "./description-editor";

// 編集面は `next/dynamic` で読まれる。先に解決しておかないと、要素を待つ時間の中に module の
// 読み込みが入る（`docs/testing-conventions.md`「`next/dynamic` を含む木を描くとき」）。
beforeAll(async () => {
  await import("@/components/design-system/rich-text/rich-text-editor/rich-text-editor");
});

const noop = () => {};

/** 呼び出し元と同じ組み立て方で採る。静的な文字列を直に置かない。 */
const CONTROL_ID = controlIdOf("form", "description");

describe("ProductDescriptionEditor", () => {
  // `next/dynamic` は `React.lazy` で、解決した値をこの module へ抱え込む。枠を通るのは
  // このファイルで最初に描いたときだけなので、枠の検証はここに 1 つだけ置き、先頭に保つ。
  it("届くまでは、出来上がりと同じ高さの枠を読み上げの外へ置く", () => {
    const { container } = render(
      <ProductDescriptionEditor id={CONTROL_ID} label="商品説明" onChange={noop} />,
    );
    const frame = container.firstElementChild;

    expect(frame).toHaveAttribute("aria-hidden", "true");
    expect(frame?.firstElementChild).toHaveClass("h-10");
    expect(frame?.lastElementChild).toHaveClass("min-h-40");
  });

  it("読み込みが終わると、書式付きの本文を書く面を出す", async () => {
    render(<ProductDescriptionEditor id={CONTROL_ID} label="商品説明" onChange={noop} />);

    expect(await screen.findByRole("textbox", { name: "商品説明" })).toBeInTheDocument();
  });

  it("保存済みの本文を開いた時点の内容として渡す", async () => {
    render(
      <ProductDescriptionEditor
        defaultValue="<p>軽い</p>"
        id={CONTROL_ID}
        label="商品説明"
        onChange={noop}
      />,
    );

    expect(await screen.findByText("軽い")).toBeInTheDocument();
  });

  it("a11y 検査を通る", async () => {
    const { container } = render(
      <ProductDescriptionEditor id={CONTROL_ID} label="商品説明" onChange={noop} />,
    );

    await screen.findByRole("textbox", { name: "商品説明" });

    expect((await axe(container)).violations).toEqual([]);
  });
});
