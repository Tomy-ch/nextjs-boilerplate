// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { failedActionState, idleActionState, succeededActionState } from "@/model/action-state";

import { WithdrawFeedback } from "./withdraw-feedback";

describe("WithdrawFeedback", () => {
  it("送る前は何も出さない", () => {
    const { container } = render(<WithdrawFeedback state={idleActionState()} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("成立したら、対象の呼び名を添えて報せる", () => {
    render(<WithdrawFeedback state={succeededActionState({ name: "山田 太郎" })} />);

    expect(screen.getByText("山田 太郎 を退会させました")).toBeInTheDocument();
  });

  it("成立の報せに、後始末が同時には終わらないことを添える", () => {
    render(<WithdrawFeedback state={succeededActionState({ name: "山田 太郎" })} />);

    expect(screen.getByText(/後から順に進みます/)).toBeInTheDocument();
  });

  it("拒まれたら、その理由をそのまま出す", () => {
    render(
      <WithdrawFeedback
        state={failedActionState({ formError: "山田 太郎 は進行中の購入が残っています。" })}
      />,
    );

    expect(screen.getByText("退会させられませんでした")).toBeInTheDocument();
    expect(screen.getByText("山田 太郎 は進行中の購入が残っています。")).toBeInTheDocument();
  });

  it("理由の無い失敗では、見出しだけを出さない", () => {
    const { container } = render(<WithdrawFeedback state={failedActionState({})} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("a11y 検査を通る", async () => {
    const { container } = render(
      <WithdrawFeedback state={succeededActionState({ name: "山田 太郎" })} />,
    );

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
