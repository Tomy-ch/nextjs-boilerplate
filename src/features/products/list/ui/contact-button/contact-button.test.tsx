// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { ToastProvider } from "@/components/shell/toaster/toaster";

import { ProductContactButton } from "./contact-button";

function renderButton() {
  return render(
    <ToastProvider>
      <ProductContactButton />
    </ToastProvider>,
  );
}

describe("ProductContactButton", () => {
  it("問い合わせの入口を操作として出す", () => {
    renderButton();

    expect(screen.getByRole("button", { name: "お問い合わせ" })).toBeInTheDocument();
  });

  it("押すと、受け口ができるまで待ってほしいことを通知で伝える", async () => {
    renderButton();

    await userEvent.click(screen.getByRole("button", { name: "お問い合わせ" }));

    expect(await screen.findByText("チャット欄の作成までお待ちください")).toBeInTheDocument();
  });

  it("押しても画面を遷移させない", async () => {
    renderButton();

    await userEvent.click(screen.getByRole("button", { name: "お問い合わせ" }));

    expect(screen.getByRole("button", { name: "お問い合わせ" })).toBeInTheDocument();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = renderButton();

    expect((await axe(container)).violations).toEqual([]);
  });
});
