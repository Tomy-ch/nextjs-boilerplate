// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { failedActionState, idleActionState, succeededActionState } from "@/model/action-state";

import { CartActionError } from "./action-error";

describe("CartActionError", () => {
  it("失敗したとき、見出しと文言を出す", () => {
    render(
      <CartActionError
        state={failedActionState({ formError: "現在サービスを利用できません。" })}
        title="数量を変更できませんでした"
      />,
    );

    expect(screen.getByText("数量を変更できませんでした")).toBeVisible();
    expect(screen.getByText("現在サービスを利用できません。")).toBeVisible();
  });

  it("まだ送っていないとき、何も出さない", () => {
    const { container } = render(
      <CartActionError state={idleActionState()} title="数量を変更できませんでした" />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("成功したとき、何も出さない", () => {
    const { container } = render(
      <CartActionError
        state={succeededActionState(undefined)}
        title="数量を変更できませんでした"
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("項目ごとの文言だけで全体の文言が無いとき、何も出さない", () => {
    const { container } = render(
      <CartActionError
        state={failedActionState({ fieldErrors: { quantity: ["範囲外です"] } })}
        title="数量を変更できませんでした"
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
