// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ refresh: () => {} }),
}));

import AuthLayout from "./layout";

describe("AuthLayout", () => {
  it("外枠へ子要素を入れる", () => {
    render(
      <AuthLayout>
        <p>テスト用コンテンツ</p>
      </AuthLayout>,
    );

    expect(within(screen.getByRole("main")).getByText("テスト用コンテンツ")).toBeVisible();
  });

  it("出発点へ戻る経路を残す", () => {
    render(
      <AuthLayout>
        <p>本文</p>
      </AuthLayout>,
    );

    expect(within(screen.getByRole("banner")).getByText("nextjs-boilerplate")).toBeVisible();
  });

  it("他の画面への導線を並べない", () => {
    render(
      <AuthLayout>
        <p>本文</p>
      </AuthLayout>,
    );

    expect(
      within(screen.getByRole("navigation", { name: "主要な導線" })).queryAllByRole("link"),
    ).toHaveLength(0);
  });

  it("a11y 違反を持たない", async () => {
    const { container } = render(
      <AuthLayout>
        <p>本文</p>
      </AuthLayout>,
    );

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });

  it("本文の脇に何も置かない", () => {
    render(
      <AuthLayout>
        <p>本文</p>
      </AuthLayout>,
    );

    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
  });
});
