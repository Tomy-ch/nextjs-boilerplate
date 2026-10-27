// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { ADMIN_USER_LIST_PATH } from "../../../../paths";
import { ISSUE_RECIPIENT_LOST_MESSAGE } from "../../form-state";
import { UnavailableRecipient } from "./unavailable-recipient";

describe("UnavailableRecipient", () => {
  // ----- 開いた時点で退会済みのとき -----
  it("退会済みなら、退会した利用者には発行できないことを見出しと本文で出し、失敗の報せにはしない", () => {
    render(<UnavailableRecipient reason="withdrawn" />);

    expect(screen.getByRole("heading", { name: "退会済みの利用者です" })).toBeInTheDocument();
    expect(screen.getByText("退会した利用者にはクーポンを発行できません。")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText(ISSUE_RECIPIENT_LOST_MESSAGE)).not.toBeInTheDocument();
  });

  it("退会済みの姿で a11y 検査を通る", async () => {
    const { container } = render(<UnavailableRecipient reason="withdrawn" />);

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });

  // ----- 送ったときに発行先を失ったとき -----
  it("発行先を失ったなら、発行できなかったことと発行されていないことを報せる", () => {
    render(<UnavailableRecipient reason="lost" />);

    const alert = screen.getByRole("alert");

    expect(alert).toHaveTextContent("発行できませんでした");
    expect(alert).toHaveTextContent(ISSUE_RECIPIENT_LOST_MESSAGE);
    expect(screen.queryByRole("heading", { name: "退会済みの利用者です" })).not.toBeInTheDocument();
  });

  it("発行先を失った姿で a11y 検査を通る", async () => {
    const { container } = render(<UnavailableRecipient reason="lost" />);

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });

  // ----- どちらのときも -----
  it.each(["withdrawn", "lost"] as const)("%s のとき、利用者一覧へ戻る導線だけを置く", (reason) => {
    render(<UnavailableRecipient reason={reason} />);

    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "利用者一覧へ戻る" })).toHaveAttribute(
      "href",
      ADMIN_USER_LIST_PATH,
    );
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});
