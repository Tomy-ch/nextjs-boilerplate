// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import { useId } from "react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { FormValidationSummary } from "./form-validation-summary";

const ERRORS = [
  { fieldId: "email", message: "メールアドレスの形式が正しくありません" },
  { fieldId: "postal-code", message: "郵便番号は 7 桁の数字で入力してください" },
];

function IdentifiedSummaryFixture() {
  const summaryId = useId();

  return (
    <div>
      <FormValidationSummary errors={ERRORS} id={summaryId} />
      <span data-testid="summary-id">{summaryId}</span>
    </div>
  );
}

function FormFixture() {
  const emailId = useId();

  return (
    <form>
      <FormValidationSummary
        errors={[{ fieldId: emailId, message: "メールアドレスの形式が正しくありません" }]}
      />
      <label htmlFor={emailId}>メールアドレス</label>
      <input aria-invalid id={emailId} name="email" />
      <div role="alert">メールアドレスの形式が正しくありません</div>
    </form>
  );
}

describe("FormValidationSummary", () => {
  it("エラーが無ければ何も描画しない", () => {
    const { container } = render(<FormValidationSummary errors={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("検証エラーを要約として読み上げ対象にする", () => {
    render(<FormValidationSummary errors={ERRORS} />);

    const summary = screen.getByRole("alert");

    expect(summary).toHaveAttribute("data-slot", "form-validation-summary");
    expect(within(summary).getByText("入力内容を確認してください")).toBeInTheDocument();
  });

  it("各エラーを該当する入力欄への link として並べる", () => {
    render(<FormValidationSummary errors={ERRORS} />);

    expect(
      screen.getByRole("link", { name: "メールアドレスの形式が正しくありません" }),
    ).toHaveAttribute("href", "#email");
    expect(
      screen.getByRole("link", { name: "郵便番号は 7 桁の数字で入力してください" }),
    ).toHaveAttribute("href", "#postal-code");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("見出しを呼び出し元が差し替えられる", () => {
    render(<FormValidationSummary errors={ERRORS} title="2 件の入力を修正してください" />);

    expect(screen.getByText("2 件の入力を修正してください")).toBeInTheDocument();
  });

  it("focus を移す呼び出し元のために id を受け取る", () => {
    render(<IdentifiedSummaryFixture />);

    const summary = screen.getByRole("alert");

    expect(summary.id).not.toBe("");
    expect(screen.getByTestId("summary-id")).toHaveTextContent(summary.id);
  });

  it("要約は field 単位の表示を置き換えない", () => {
    render(<FormFixture />);

    expect(screen.getAllByRole("alert")).toHaveLength(2);
    expect(
      screen.getByRole("link", { name: "メールアドレスの形式が正しくありません" }),
    ).toHaveAttribute("href", `#${screen.getByLabelText("メールアドレス").id}`);
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<FormValidationSummary errors={ERRORS} />);

    const result = await axe(container, { rules: { "color-contrast": { enabled: false } } });

    expect(result.violations).toEqual([]);
  });
});
