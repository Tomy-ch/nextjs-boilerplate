// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {} }) }));

import AuthLayout from "./layout";

describe("AuthLayout", () => {
  // ----- 正常系 -----
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

  // ----- 異常系 -----
  it("他の画面への導線を並べない", () => {
    render(
      <AuthLayout>
        <p>本文</p>
      </AuthLayout>,
    );

    // 認証を促している最中に離脱させると、元の操作へ戻れなくなる。
    expect(within(screen.getByRole("banner")).queryByRole("link", { name: "商品" })).toBeNull();
  });

  it("カートを出さない", () => {
    render(
      <AuthLayout>
        <p>本文</p>
      </AuthLayout>,
    );

    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
  });
});
