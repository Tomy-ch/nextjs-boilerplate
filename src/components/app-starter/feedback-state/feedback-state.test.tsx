// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import { FeedbackState } from "./feedback-state";
import { FEEDBACK_STATE_KIND } from "./feedback-state.definition";

describe("FeedbackState", () => {
  it("読み込み中は status として伝える", () => {
    render(<FeedbackState kind={FEEDBACK_STATE_KIND.LOADING} title="読み込んでいます" />);

    expect(screen.getByRole("status")).toHaveTextContent("読み込んでいます");
  });

  it("項目が無い状態は status として伝える", () => {
    render(<FeedbackState kind={FEEDBACK_STATE_KIND.EMPTY} title="表示する項目がありません" />);

    expect(screen.getByRole("status")).toHaveTextContent("表示する項目がありません");
  });

  it("失敗は alert として割り込みで伝える", () => {
    render(<FeedbackState kind={FEEDBACK_STATE_KIND.ERROR} title="読み込みに失敗しました" />);

    expect(screen.getByRole("alert")).toHaveTextContent("読み込みに失敗しました");
  });

  it("成功は status として伝える", () => {
    render(<FeedbackState kind={FEEDBACK_STATE_KIND.SUCCESS} title="保存しました" />);

    expect(screen.getByRole("status")).toHaveTextContent("保存しました");
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
