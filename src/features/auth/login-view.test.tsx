// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import { toSafeReturnUrl } from "@/model/return-url";

import { LoginView } from "./login-view";

describe("LoginView", () => {
  it("認証を始める操作を出す", () => {
    render(<LoginView returnUrl={toSafeReturnUrl("/")} />);

    expect(screen.getByRole("button", { name: "ログインへ進む" })).toBeVisible();
  });

  it("認証の開始を BFF の口へ送る", () => {
    const { container } = render(<LoginView returnUrl={toSafeReturnUrl("/")} />);

    expect(container.querySelector("form")).toHaveAttribute("action", "/api/auth/login");
  });

  it("復帰先を送信内容に含める", () => {
    const { container } = render(<LoginView returnUrl={toSafeReturnUrl("/mypage")} />);

    expect(container.querySelector('input[name="returnUrl"]')).toHaveValue("/mypage");
  });

  it("画面の名前を見出しに出す", () => {
    render(<LoginView returnUrl={toSafeReturnUrl("/")} />);

    expect(screen.getByText("ログイン")).toBeVisible();
  });

  it("認証後に元の操作へ戻ることを伝える", () => {
    render(<LoginView returnUrl={toSafeReturnUrl("/")} />);

    expect(screen.getByText(/元の操作に戻ります/)).toBeVisible();
  });

  it("押した先がこのアプリの外であることを、押す前に伝える", () => {
    render(<LoginView returnUrl={toSafeReturnUrl("/")} />);

    expect(screen.getByText(/このアプリの外にある認証基盤/)).toBeVisible();
  });

  it("この画面がアカウントを作らないことを伝える", () => {
    render(<LoginView returnUrl={toSafeReturnUrl("/")} />);

    expect(screen.getByText(/アカウントを作らず/)).toBeVisible();
  });

  it("ADR 0011 が例示する認証基盤の名前を出さない", () => {
    const { container } = render(<LoginView returnUrl={toSafeReturnUrl("/")} />);

    for (const name of ["Cognito", "Keycloak"]) {
      expect(container.textContent).not.toContain(name);
    }
  });

  it("資格情報の入力欄を持たない", () => {
    const { container } = render(<LoginView returnUrl={toSafeReturnUrl("/")} />);

    expect(container.querySelector('input[type="password"]')).toBeNull();
    expect(container.querySelector('input[type="email"]')).toBeNull();
  });

  it("リンクで認証を始めない", () => {
    render(<LoginView returnUrl={toSafeReturnUrl("/")} />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("認証の開始を安全なメソッドの範囲に収める", () => {
    const { container } = render(<LoginView returnUrl={toSafeReturnUrl("/")} />);

    expect(container.querySelector("form")).toHaveAttribute("method", "get");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<LoginView returnUrl={toSafeReturnUrl("/")} />);

    expect((await axe(container)).violations).toEqual([]);
  });
});
