// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { InvalidQueryFeedback, type InvalidQueryFeedbackProps } from "./invalid-query-feedback";

const KEY_LABELS = { categoryCodes: "分類", keyword: "キーワード" };

function renderQuery(props: Partial<InvalidQueryFeedbackProps> = {}) {
  return render(
    <InvalidQueryFeedback
      invalidKeys={[]}
      keyLabels={KEY_LABELS}
      message="不正です。"
      resetHref="/items"
      resetLabel="条件を外して一覧を見る"
      title="この条件では一覧を表示できません"
      {...props}
    />,
  );
}

describe("InvalidQueryFeedback", () => {
  it("何を出せないのかを題で示す", () => {
    renderQuery({ title: "この期間では集計を表示できません" });

    expect(screen.getByText("この期間では集計を表示できません")).toBeInTheDocument();
  });

  it("渡された文言を出す", () => {
    renderQuery({ message: "入力内容が正しくありません。" });

    expect(screen.getByText("入力内容が正しくありません。")).toBeInTheDocument();
  });

  it("契約を外れた条件を画面上の呼び名で示す", () => {
    renderQuery({ invalidKeys: ["categoryCodes", "keyword"] });

    expect(screen.getByText("確認する条件: 分類、キーワード")).toBeInTheDocument();
  });

  it("条件を外して戻る導線を添える", () => {
    renderQuery({ invalidKeys: ["keyword"] });

    expect(screen.getByRole("link", { name: "条件を外して一覧を見る" })).toHaveAttribute(
      "href",
      "/items",
    );
  });
  it("表に無いキーはそのまま出す", () => {
    renderQuery({ invalidKeys: ["sort"] });

    expect(screen.getByText("確認する条件: sort")).toBeInTheDocument();
  });

  it("外れた条件が無ければその行を出さない", () => {
    renderQuery();

    expect(screen.queryByText(/確認する条件/)).not.toBeInTheDocument();
  });

  it("a11y 検査を通る", async () => {
    const { container } = renderQuery({ invalidKeys: ["keyword"] });

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
