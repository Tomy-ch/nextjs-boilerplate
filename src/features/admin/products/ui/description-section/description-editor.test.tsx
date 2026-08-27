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
  // 枠の検証はここに 1 つだけ置き、先頭に保つ（`React.lazy` は解決した値をこの module へ
  // 抱え込むため、2 つ目を足しても枠を通らない）。
  it("届くまでは、出来上がりと同じ高さの枠を読み上げの外へ置く", () => {
    const { container } = render(
      <ProductDescriptionEditor active={true} id={CONTROL_ID} label="商品説明" onChange={noop} />,
    );
    const frame = container.firstElementChild;

    expect(frame).toHaveAttribute("aria-hidden", "true");
    expect(frame?.firstElementChild).toHaveClass("h-10");
    expect(frame?.lastElementChild).toHaveClass("min-h-40");
  });

  it("読み込みが終わると、書式付きの本文を書く面を出す", async () => {
    render(
      <ProductDescriptionEditor active={true} id={CONTROL_ID} label="商品説明" onChange={noop} />,
    );

    expect(await screen.findByRole("textbox", { name: "商品説明" })).toBeInTheDocument();
  });

  it("開かれるまでは編集面を出さず、枠のまま置く", async () => {
    const { container } = render(
      <ProductDescriptionEditor active={false} id={CONTROL_ID} label="商品説明" onChange={noop} />,
    );

    await Promise.resolve();

    expect(screen.queryByRole("textbox", { name: "商品説明" })).not.toBeInTheDocument();
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("閉じた段が開かれたら、そこで初めて編集面を読み込む", async () => {
    const { rerender } = render(
      <ProductDescriptionEditor active={false} id={CONTROL_ID} label="商品説明" onChange={noop} />,
    );

    expect(screen.queryByRole("textbox", { name: "商品説明" })).not.toBeInTheDocument();

    rerender(
      <ProductDescriptionEditor active={true} id={CONTROL_ID} label="商品説明" onChange={noop} />,
    );

    expect(await screen.findByRole("textbox", { name: "商品説明" })).toBeInTheDocument();
  });

  it("一度開いたら、閉じても編集面を外さない", async () => {
    const { rerender } = render(
      <ProductDescriptionEditor active={true} id={CONTROL_ID} label="商品説明" onChange={noop} />,
    );

    await screen.findByRole("textbox", { name: "商品説明" });

    rerender(
      <ProductDescriptionEditor active={false} id={CONTROL_ID} label="商品説明" onChange={noop} />,
    );

    expect(screen.getByRole("textbox", { name: "商品説明" })).toBeInTheDocument();
  });

  it("保存済みの本文を開いた時点の内容として渡す", async () => {
    render(
      <ProductDescriptionEditor
        active={true}
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
      <ProductDescriptionEditor active={true} id={CONTROL_ID} label="商品説明" onChange={noop} />,
    );

    await screen.findByRole("textbox", { name: "商品説明" });

    expect((await axe(container)).violations).toEqual([]);
  });
});
