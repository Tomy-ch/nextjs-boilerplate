// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import { toSafeReturnUrl } from "@/model/return-url";

import { LOGIN_NOTICE } from "./login-notice";
import { LoginView } from "./login-view";

describe("LoginView", () => {
  it("認証を始める操作を出す", () => {
    render(<LoginView returnUrl={toSafeReturnUrl("/")} notice={null} />);

    expect(screen.getByRole("button", { name: "ログインへ進む" })).toBeVisible();
  });

  it("認証の開始を BFF の口へ送る", () => {
    const { container } = render(<LoginView returnUrl={toSafeReturnUrl("/")} notice={null} />);

    expect(container.querySelector("form")).toHaveAttribute("action", "/api/auth/login");
  });

  it("復帰先を送信内容に含める", () => {
    const { container } = render(
      <LoginView returnUrl={toSafeReturnUrl("/mypage")} notice={null} />,
    );

    expect(container.querySelector('input[name="returnUrl"]')).toHaveValue("/mypage");
  });

  it("画面の名前を見出しに出す", () => {
    render(<LoginView returnUrl={toSafeReturnUrl("/")} notice={null} />);

    expect(screen.getByText("ログイン")).toBeVisible();
  });

  it("認証後に元の操作へ戻ることを伝える", () => {
    render(<LoginView returnUrl={toSafeReturnUrl("/")} notice={null} />);

    expect(screen.getByText(/元の操作に戻ります/)).toBeVisible();
  });

  it("資格情報の入力欄を持たない", () => {
    const { container } = render(<LoginView returnUrl={toSafeReturnUrl("/")} notice={null} />);

    expect(container.querySelector('input[type="password"]')).toBeNull();
    expect(container.querySelector('input[type="email"]')).toBeNull();
  });

  it("リンクで認証を始めない", () => {
    render(<LoginView returnUrl={toSafeReturnUrl("/")} notice={null} />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("認証の開始を安全なメソッドの範囲に収める", () => {
    const { container } = render(<LoginView returnUrl={toSafeReturnUrl("/")} notice={null} />);

    expect(container.querySelector("form")).toHaveAttribute("method", "get");
  });

  it("始められなかった理由を、支援技術へ伝わる形で出す", () => {
    render(<LoginView returnUrl={toSafeReturnUrl("/")} notice={LOGIN_NOTICE.UNAVAILABLE} />);

    expect(screen.getByRole("alert")).toHaveTextContent("認証を始められませんでした");
  });

  it("もう一度試せることを案内に書く", () => {
    render(<LoginView returnUrl={toSafeReturnUrl("/")} notice={LOGIN_NOTICE.UNAVAILABLE} />);

    expect(screen.getByRole("alert")).toHaveTextContent("もう一度お試しください");
  });

  it("案内を出しても、認証を始める操作は残す", () => {
    render(<LoginView returnUrl={toSafeReturnUrl("/")} notice={LOGIN_NOTICE.UNAVAILABLE} />);

    expect(screen.getByRole("button", { name: "ログインへ進む" })).toBeVisible();
  });

  it("案内を、認証を始める操作より前に置く", () => {
    render(<LoginView returnUrl={toSafeReturnUrl("/")} notice={LOGIN_NOTICE.UNAVAILABLE} />);

    const button = screen.getByRole("button", { name: "ログインへ進む" });

    expect(screen.getByRole("alert").compareDocumentPosition(button)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it("理由が無ければ案内を出さない", () => {
    render(<LoginView returnUrl={toSafeReturnUrl("/")} notice={null} />);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("a11y 違反を持たない", async () => {
    const { container } = render(<LoginView returnUrl={toSafeReturnUrl("/")} notice={null} />);

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });

  it("案内を出した状態でも a11y 違反を持たない", async () => {
    const { container } = render(
      <LoginView returnUrl={toSafeReturnUrl("/")} notice={LOGIN_NOTICE.UNAVAILABLE} />,
    );

    expect(screen.getByRole("alert")).toBeVisible();
    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
