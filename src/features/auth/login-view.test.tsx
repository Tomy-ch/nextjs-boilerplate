// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LoginView } from "./login-view";

describe("LoginView", () => {
  it("認証を始める操作を出す", () => {
    render(<LoginView returnUrl="/" />);

    expect(screen.getByRole("button", { name: "ログインへ進む" })).toBeVisible();
  });

  it("認証の開始を BFF の口へ送る", () => {
    const { container } = render(<LoginView returnUrl="/" />);

    expect(container.querySelector("form")).toHaveAttribute("action", "/api/auth/login");
  });

  it("復帰先を送信内容に含める", () => {
    const { container } = render(<LoginView returnUrl="/mypage" />);

    expect(container.querySelector('input[name="returnUrl"]')).toHaveValue("/mypage");
  });

  it("画面の名前を見出しに出す", () => {
    render(<LoginView returnUrl="/" />);

    expect(screen.getByText("ログイン")).toBeVisible();
  });

  it("認証後に元の操作へ戻ることを伝える", () => {
    render(<LoginView returnUrl="/" />);

    expect(screen.getByText(/元の操作に戻ります/)).toBeVisible();
  });

  it("資格情報の入力欄を持たない", () => {
    const { container } = render(<LoginView returnUrl="/" />);

    expect(container.querySelector('input[type="password"]')).toBeNull();
    expect(container.querySelector('input[type="email"]')).toBeNull();
  });

  it("リンクで認証を始めない", () => {
    render(<LoginView returnUrl="/" />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("認証の開始を安全なメソッドの範囲に収める", () => {
    const { container } = render(<LoginView returnUrl="/" />);

    expect(container.querySelector("form")).toHaveAttribute("method", "get");
  });
});
