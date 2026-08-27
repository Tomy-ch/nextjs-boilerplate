// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

const { verifySession, redirect } = vi.hoisted(() => ({
  verifySession: vi.fn(),
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

vi.mock("@/adapters/server/auth/session", () => ({ verifySession }));
vi.mock("next/navigation", () => ({
  redirect,
  usePathname: () => "/admin/products",
  // 器は書きかけのまま離れる操作を見張るため、遷移の口も要る。
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

import { SESSION_ROLE, type Session } from "@/model/session";

import AdminLayout from "./layout";

function session(role: Session["role"]): Session {
  return { userId: "user-1", role, expiresAt: new Date("2026-01-01T00:00:00Z") };
}

async function renderLayout() {
  return render(await AdminLayout({ breadcrumb: <p>現在地</p>, children: <p>本文</p> }));
}

beforeEach(() => {
  vi.clearAllMocks();
  verifySession.mockResolvedValue(session(SESSION_ROLE.admin));
});

describe("AdminLayout", () => {
  // ----- 管理の役割を持つとき -----
  it("管理の器へ子要素を入れる", async () => {
    await renderLayout();

    expect(screen.getByRole("main")).toHaveTextContent("本文");
  });

  it("商品一覧管理への導線を並べる", async () => {
    await renderLayout();

    expect(screen.getByRole("link", { name: "商品一覧管理" })).toHaveAttribute(
      "href",
      "/admin/products",
    );
  });

  it("利用者向け画面へ戻る導線を header へ渡す", async () => {
    await renderLayout();

    expect(screen.getByRole("link", { name: "ユーザー画面へ" })).toHaveAttribute(
      "href",
      "/products",
    );
  });

  it("サイト名からトップへ戻れる", async () => {
    await renderLayout();

    expect(screen.getByRole("link", { name: "nextjs-boilerplate" })).toHaveAttribute("href", "/");
  });

  it("送り返さない", async () => {
    await renderLayout();

    expect(redirect).not.toHaveBeenCalled();
  });

  // ----- 役割が足りないとき -----
  it("役割を持たない主体を送り返す", async () => {
    verifySession.mockResolvedValue(session(SESSION_ROLE.user));

    await expect(renderLayout()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/");
  });

  it("未認証を送り返す", async () => {
    verifySession.mockResolvedValue(null);

    await expect(renderLayout()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/");
  });

  it("並行の route から受け取った階層を器へ渡す", async () => {
    await renderLayout();

    expect(screen.getByText("現在地")).toBeInTheDocument();
  });

  it("前捌きの結果を当てにせず自分で確かめる", async () => {
    await renderLayout();

    expect(verifySession).toHaveBeenCalledTimes(1);
  });

  it("a11y 検査を通る", async () => {
    const { container } = render(
      await AdminLayout({ breadcrumb: <p>現在地</p>, children: <p>本文</p> }),
    );

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
