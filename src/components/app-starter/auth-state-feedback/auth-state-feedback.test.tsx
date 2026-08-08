// @vitest-environment jsdom

import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { AuthSignInAction, AuthStateFeedback } from "./auth-state-feedback";
import { AUTH_STATE, AUTH_STATE_MESSAGE } from "./auth-state-feedback.definition";

describe("AuthStateFeedback", () => {
  it("未認証の既定の見出しと説明を表示する", () => {
    render(<AuthStateFeedback state={AUTH_STATE.UNAUTHENTICATED} />);
    const feedback = screen.getByRole("alert");
    const message = AUTH_STATE_MESSAGE[AUTH_STATE.UNAUTHENTICATED];

    expect(within(feedback).getByText(message.title)).toBeInTheDocument();
    expect(within(feedback).getByText(message.description)).toBeInTheDocument();
  });

  it("セッション切れの既定の見出しと説明を表示する", () => {
    render(<AuthStateFeedback state={AUTH_STATE.SESSION_EXPIRED} />);
    const feedback = screen.getByRole("alert");
    const message = AUTH_STATE_MESSAGE[AUTH_STATE.SESSION_EXPIRED];

    expect(within(feedback).getByText(message.title)).toBeInTheDocument();
    expect(within(feedback).getByText(message.description)).toBeInTheDocument();
  });

  it("権限不足の既定の見出しと説明を表示する", () => {
    render(<AuthStateFeedback state={AUTH_STATE.FORBIDDEN} />);
    const feedback = screen.getByRole("alert");
    const message = AUTH_STATE_MESSAGE[AUTH_STATE.FORBIDDEN];

    expect(within(feedback).getByText(message.title)).toBeInTheDocument();
    expect(within(feedback).getByText(message.description)).toBeInTheDocument();
  });

  it("対象が見つからない場合の既定の見出しと説明を表示する", () => {
    render(<AuthStateFeedback state={AUTH_STATE.NOT_FOUND} />);
    const feedback = screen.getByRole("alert");
    const message = AUTH_STATE_MESSAGE[AUTH_STATE.NOT_FOUND];

    expect(within(feedback).getByText(message.title)).toBeInTheDocument();
    expect(within(feedback).getByText(message.description)).toBeInTheDocument();
  });

  it("権限不足だけを注意として示す", () => {
    render(<AuthStateFeedback state={AUTH_STATE.FORBIDDEN} />);

    expect(screen.getByRole("alert").className).toContain("warning");
  });

  it("再試行では解決しない状態を通信の失敗と区別できるよう state を持つ", () => {
    render(<AuthStateFeedback state={AUTH_STATE.SESSION_EXPIRED} />);

    expect(screen.getByRole("alert")).toHaveAttribute("data-state", "session-expired");
  });

  it("見出しと説明を呼び出し元が差し替えられる", () => {
    render(
      <AuthStateFeedback
        description="この内容を見るには、管理者の権限が必要です。"
        state={AUTH_STATE.FORBIDDEN}
        title="この情報を表示できません"
      />,
    );

    expect(screen.getByText("この情報を表示できません")).toBeInTheDocument();
    expect(screen.getByText("この内容を見るには、管理者の権限が必要です。")).toBeInTheDocument();
  });

  it("次に取る行動を合成できる", () => {
    render(
      <AuthStateFeedback state={AUTH_STATE.UNAUTHENTICATED}>
        <AuthSignInAction href="/api/auth/login?returnUrl=%2Fplans" />
      </AuthStateFeedback>,
    );

    expect(screen.getByRole("link", { name: "サインインする" })).toHaveAttribute(
      "href",
      "/api/auth/login?returnUrl=%2Fplans",
    );
  });

  it("サインインの導線は client 遷移せず document 遷移する", () => {
    let preventedByAction: boolean | undefined;

    function captureNavigation(event: Event) {
      preventedByAction = event.defaultPrevented;
      event.preventDefault();
    }

    document.addEventListener("click", captureNavigation);
    render(<AuthSignInAction href="/api/auth/login" />);

    fireEvent.click(screen.getByRole("link", { name: "サインインする" }));
    document.removeEventListener("click", captureNavigation);

    expect(preventedByAction).toBe(false);
  });

  it("サインインの文言を呼び出し元が差し替えられる", () => {
    render(<AuthSignInAction href="/api/auth/login">別のアカウントでサインイン</AuthSignInAction>);

    expect(screen.getByRole("link", { name: "別のアカウントでサインイン" })).toBeInTheDocument();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(
      <AuthStateFeedback state={AUTH_STATE.SESSION_EXPIRED}>
        <AuthSignInAction href="/api/auth/login" />
      </AuthStateFeedback>,
    );

    const result = await axe(container, { rules: { "color-contrast": { enabled: false } } });

    expect(result.violations).toEqual([]);
  });
});

describe("AuthSignInAction", () => {
  // ----- 正常系 -----
  it("サインイン先を指す link として既定の文言を出す", () => {
    render(<AuthSignInAction href="/auth/sign-in" />);

    expect(screen.getByRole("link", { name: "サインインする" })).toHaveAttribute(
      "href",
      "/auth/sign-in",
    );
  });

  it("文言を呼び出し元が差し替えられる", () => {
    render(<AuthSignInAction href="/auth/sign-in">続ける</AuthSignInAction>);

    expect(screen.getByRole("link", { name: "続ける" })).toBeInTheDocument();
  });
});
