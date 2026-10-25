// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { ISSUE_RECIPIENT, LONG_NAME_RECIPIENT } from "../../coupon-new.fixture";
import { IssueRecipientCard } from "./recipient-card";

function summaryOf(scope: HTMLElement): [string | null, string | null][] {
  const details = within(scope).getAllByRole("definition");

  return within(scope)
    .getAllByRole("term")
    .map((term, index) => [term.textContent, details[index]?.textContent ?? null]);
}

describe("IssueRecipientCard", () => {
  it("発行先の見出しの下に、氏名とメールアドレスを語と値の組で出す", () => {
    const { container } = render(<IssueRecipientCard recipient={ISSUE_RECIPIENT} />);

    expect(screen.getByRole("heading", { name: "発行先" })).toBeInTheDocument();
    expect(summaryOf(container)).toEqual([
      ["氏名", ISSUE_RECIPIENT.name],
      ["メールアドレス", ISSUE_RECIPIENT.email],
    ]);
  });

  it("発行先をこの画面では変えられず、変えるなら利用者一覧から選び直すことを添える", () => {
    render(<IssueRecipientCard recipient={ISSUE_RECIPIENT} />);

    expect(
      screen.getByText(
        "この画面では発行先を変えられません。別の利用者へ発行するときは、利用者一覧から選び直してください。",
      ),
    ).toBeInTheDocument();
  });

  it("発行先を選ぶ・打つ操作を置かない", () => {
    render(<IssueRecipientCard recipient={ISSUE_RECIPIENT} />);

    for (const role of ["textbox", "combobox", "radio", "button", "link"] as const) {
      expect(screen.queryAllByRole(role)).toHaveLength(0);
    }
  });

  it("長い氏名とメールアドレスも、省かずにそのまま出す", () => {
    const { container } = render(<IssueRecipientCard recipient={LONG_NAME_RECIPIENT} />);

    expect(summaryOf(container)).toEqual([
      ["氏名", LONG_NAME_RECIPIENT.name],
      ["メールアドレス", LONG_NAME_RECIPIENT.email],
    ]);
  });

  it("a11y 検査を通る", async () => {
    const { container } = render(<IssueRecipientCard recipient={ISSUE_RECIPIENT} />);

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
