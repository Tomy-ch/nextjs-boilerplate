// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { ErrorKind } from "@/errors/error-kind";
import { failedActionState, idleActionState, succeededActionState } from "@/model/action-state";

import { SUSPEND_CONFLICT_MESSAGE } from "../../form-state";
import { SuspendFeedback } from "./suspend-feedback";

const CODE = "SPRING2026";
const CONFLICT = `${CODE} は${SUSPEND_CONFLICT_MESSAGE}`;

describe("SuspendFeedback", () => {
  // ----- 送る前 -----
  it("送る前は何も出さない", () => {
    const { container } = render(<SuspendFeedback state={idleActionState()} />);

    expect(container).toBeEmptyDOMElement();
  });

  // ----- 成立したとき -----
  it("成立したら、対象のコードを添えて報せる", () => {
    render(<SuspendFeedback state={succeededActionState({ code: CODE })} />);

    expect(
      within(screen.getByRole("alert")).getByText(`${CODE} の配布を停止しました`),
    ).toBeInTheDocument();
  });

  it("成立の報せに、配ったクーポンは無効にならないことを添える", () => {
    render(<SuspendFeedback state={succeededActionState({ code: CODE })} />);

    expect(
      within(screen.getByRole("alert")).getByText(/すでに配ったクーポンは無効にならず/),
    ).toBeInTheDocument();
  });

  it("成立の報せを、失敗の報せと同じ見た目にしない", () => {
    const { unmount } = render(<SuspendFeedback state={succeededActionState({ code: CODE })} />);
    const succeeded = screen.getByRole("alert").className;

    unmount();
    render(<SuspendFeedback state={failedActionState({ formError: CONFLICT })} />);

    expect(screen.getByRole("alert").className).not.toBe(succeeded);
  });

  // ----- 拒まれたとき -----
  it("拒まれたら、見出しと理由をそのまま出す", () => {
    render(
      <SuspendFeedback
        state={failedActionState({ formError: CONFLICT, kind: ErrorKind.CONFLICT })}
      />,
    );

    const alert = screen.getByRole("alert");

    expect(within(alert).getByText("配布を停止できませんでした")).toBeInTheDocument();
    expect(within(alert).getByText(CONFLICT)).toBeInTheDocument();
  });

  it("理由の無い失敗では、見出しだけを出さない", () => {
    const { container } = render(<SuspendFeedback state={failedActionState({})} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("成立の報せが a11y 検査を通る", async () => {
    const { container } = render(<SuspendFeedback state={succeededActionState({ code: CODE })} />);

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });

  it("拒まれた報せが a11y 検査を通る", async () => {
    const { container } = render(
      <SuspendFeedback state={failedActionState({ formError: CONFLICT })} />,
    );

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
