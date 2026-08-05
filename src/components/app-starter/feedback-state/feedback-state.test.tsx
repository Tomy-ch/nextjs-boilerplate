// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import { FeedbackState } from "./feedback-state";
import { FEEDBACK_STATE_KIND, type FeedbackStateKind } from "./feedback-state.definition";

const feedbackStateCases: Array<{
  kind: FeedbackStateKind;
  title: string;
  role: "alert" | "status";
}> = [
  {
    kind: FEEDBACK_STATE_KIND.LOADING,
    title: "読み込んでいます",
    role: "status",
  },
  {
    kind: FEEDBACK_STATE_KIND.EMPTY,
    title: "表示する項目がありません",
    role: "status",
  },
  {
    kind: FEEDBACK_STATE_KIND.ERROR,
    title: "読み込みに失敗しました",
    role: "alert",
  },
  {
    kind: FEEDBACK_STATE_KIND.SUCCESS,
    title: "保存しました",
    role: "status",
  },
];

describe("FeedbackState", () => {
  it.each(feedbackStateCases)("$kind 状態を適切な role で表示する", ({ kind, title, role }) => {
    render(<FeedbackState kind={kind} title={title} />);

    expect(screen.getByRole(role)).toHaveTextContent(title);
  });

  it("説明文を表示し、a11y 自動検査に違反しない", async () => {
    const { container } = render(
      <FeedbackState
        kind={FEEDBACK_STATE_KIND.EMPTY}
        title="表示する項目がありません"
        description="条件を変えてもう一度試してください。"
      />,
    );

    expect(screen.getByText("条件を変えてもう一度試してください。")).toBeVisible();

    const result = await axe(container, { rules: { "color-contrast": { enabled: false } } });

    expect(result.violations).toEqual([]);
  });
});
