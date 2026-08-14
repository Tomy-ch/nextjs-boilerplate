// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import LoginPage, { metadata } from "./page";

/** RSC を描いて DOM を得る。 */
async function renderPage(searchParams: Record<string, string | string[] | undefined>) {
  return render(await LoginPage({ searchParams: Promise.resolve(searchParams) }));
}

describe("LoginPage", () => {
  it("この画面の名前と説明を metadata に持つ", () => {
    expect(metadata.title).toBe("ログイン");
  });

  it("検索エンジンに拾わせない", () => {
    expect(metadata.robots).toMatchObject({ index: false });
  });

  it("復帰先を画面へ渡す", async () => {
    const { container } = await renderPage({ returnUrl: "/mypage" });

    expect(container.querySelector('input[name="returnUrl"]')).toHaveValue("/mypage");
  });

  it("認証を始める操作を出す", async () => {
    await renderPage({});

    expect(screen.getByRole("button", { name: "ログインへ進む" })).toBeVisible();
  });

  it("a11y 違反を持たない", async () => {
    const { container } = await renderPage({});

    // jsdom は色を計算しないため、コントラストは story 側の実ブラウザ検査が見る（ADR 0091 §2）。
    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });

  it("復帰先が無ければルートへ戻す", async () => {
    const { container } = await renderPage({});

    expect(container.querySelector('input[name="returnUrl"]')).toHaveValue("/");
  });

  it("外部 URL の復帰先を落とす", async () => {
    const { container } = await renderPage({ returnUrl: "https://evil.example.test" });

    expect(container.querySelector('input[name="returnUrl"]')).toHaveValue("/");
  });

  it("復帰先が複数指定されていれば落とす", async () => {
    const { container } = await renderPage({ returnUrl: ["/mypage", "/admin"] });

    expect(container.querySelector('input[name="returnUrl"]')).toHaveValue("/");
  });
});
