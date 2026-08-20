// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { failedActionState, idleActionState } from "@/model/action-state";

import type { ProductFormState } from "../../form-state";
import { ProductFormFeedback } from "./form-feedback";

function renderFeedback(state: ProductFormState, dismissed = false) {
  return render(
    <ProductFormFeedback
      dismissed={dismissed}
      idPrefix="form"
      state={state}
      title="登録できませんでした"
    >
      <a href="/admin/products">読み込み直す</a>
    </ProductFormFeedback>,
  );
}

describe("ProductFormFeedback", () => {
  // ----- 正常系 -----
  it("まだ送っていなければ何も出さない", () => {
    const { container } = renderFeedback(idleActionState());

    expect(container).toBeEmptyDOMElement();
  });

  // ----- 異常系 -----
  it("送信そのものが通らなかったときは、その要約を出す", () => {
    renderFeedback(failedActionState({ formError: "認証が必要です。" }));

    expect(screen.getByText("登録できませんでした")).toBeInTheDocument();
    expect(screen.getByText("認証が必要です。")).toBeInTheDocument();
  });

  it("次の行動へ進む要素を添えられる", () => {
    renderFeedback(failedActionState({ formError: "版が食い違いました。" }));

    expect(screen.getByRole("link", { name: "読み込み直す" })).toBeInTheDocument();
  });

  it("項目ごとの誤りは、直しに行ける一覧として出す", () => {
    renderFeedback(
      failedActionState({ formError: null, fieldErrors: { name: ["商品名を入力してください。"] } }),
    );

    expect(screen.getByRole("link", { name: /商品名/ })).toHaveAttribute("href", "#form-name");
  });

  it("項目ごとの誤りだけのときは、全体の要約を出さない", () => {
    renderFeedback(
      failedActionState({ formError: null, fieldErrors: { name: ["商品名を入力してください。"] } }),
    );

    expect(screen.queryByText("登録できませんでした")).not.toBeInTheDocument();
  });

  it("下げた後は出さない。直したのに直っていないように見せないため", () => {
    const { container } = renderFeedback(failedActionState({ formError: "通らなかった" }), true);

    expect(container).toBeEmptyDOMElement();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = renderFeedback(
      failedActionState({ formError: "通らなかった", fieldErrors: { name: ["入れてください。"] } }),
    );

    expect((await axe(container)).violations).toEqual([]);
  });
});
