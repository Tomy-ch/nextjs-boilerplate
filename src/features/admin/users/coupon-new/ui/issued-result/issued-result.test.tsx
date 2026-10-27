// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { ADMIN_USER_LIST_PATH } from "../../../../paths";
import { ISSUE_RECIPIENT } from "../../coupon-new.fixture";
import type { IssueSummaryRow } from "../../issue-summary";
import { IssuedResult, type IssuedResultProps } from "./issued-result";

const SUMMARY: readonly IssueSummaryRow[] = [
  { term: "値引き", detail: "5 ドル引き" },
  { term: "値引きの対象", detail: "特定のカテゴリ：家電" },
  { term: "最低購入額", detail: "なし" },
];

function renderResult(overrides: Partial<IssuedResultProps> = {}) {
  const props: IssuedResultProps = {
    recipientName: ISSUE_RECIPIENT.name,
    summary: SUMMARY,
    onIssueAnother: vi.fn(),
    ...overrides,
  };

  return { ...render(<IssuedResult {...props} />), props };
}

describe("IssuedResult", () => {
  it("発行先の名前で、クーポンを 1 枚発行したことを報せる", () => {
    renderResult();

    expect(screen.getByRole("alert")).toHaveTextContent(
      `${ISSUE_RECIPIENT.name} さんにクーポンを 1 枚発行しました`,
    );
  });

  it("発行した内容を、語と値の組として渡された順に並べる", () => {
    renderResult();

    const alert = screen.getByRole("alert");

    expect(
      within(alert)
        .getAllByRole("term")
        .map((term) => term.textContent),
    ).toEqual(["値引き", "値引きの対象", "最低購入額"]);
    expect(
      within(alert)
        .getAllByRole("definition")
        .map((detail) => detail.textContent),
    ).toEqual(["5 ドル引き", "特定のカテゴリ：家電", "なし"]);
  });

  it("報せが読み込み直すと消え、発行は取り消せないことを添える", () => {
    renderResult();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "この報せは画面を読み込み直すと消えます。発行したクーポンは取り消せません。",
    );
  });

  it("続けて発行する操作は、もう 1 枚発行したいことだけを伝える", async () => {
    const { props } = renderResult();

    await userEvent.click(screen.getByRole("button", { name: "続けて発行する" }));

    expect(props.onIssueAnother).toHaveBeenCalledTimes(1);
  });

  it("利用者一覧へ戻る導線を置く", () => {
    renderResult();

    expect(screen.getByRole("link", { name: "利用者一覧へ戻る" })).toHaveAttribute(
      "href",
      ADMIN_USER_LIST_PATH,
    );
  });

  it("a11y 検査を通る", async () => {
    const { container } = renderResult();

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
