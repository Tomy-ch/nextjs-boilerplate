// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { verifySession } = vi.hoisted(() => ({ verifySession: vi.fn() }));

vi.mock("@/adapters/server/auth/session", () => ({ verifySession }));

import { SESSION_ROLE } from "@/model/session";

import { AdminNavEntry } from "./admin-nav-entry";

const EXPIRES_AT = new Date("2026-01-01T00:00:00Z");

beforeEach(() => {
  vi.clearAllMocks();
  verifySession.mockResolvedValue(null);
});

describe("AdminNavEntry", () => {
  // ----- 入口を出すとき -----
  it("管理の役割を持つ主体には管理への入口を出す", async () => {
    verifySession.mockResolvedValue({
      userId: "admin-1",
      role: SESSION_ROLE.admin,
      expiresAt: EXPIRES_AT,
    });

    render(await AdminNavEntry({}));

    expect(screen.getByRole("link", { name: "管理" })).toHaveAttribute("href", "/admin/products");
  });

  it("履歴を積まない指定でも同じ入口を出す", async () => {
    verifySession.mockResolvedValue({
      userId: "admin-1",
      role: SESSION_ROLE.admin,
      expiresAt: EXPIRES_AT,
    });

    render(await AdminNavEntry({ replace: true }));

    expect(screen.getByRole("link", { name: "管理" })).toHaveAttribute("href", "/admin/products");
  });

  // ----- 入口を出さないとき -----
  it("役割を持たない主体には管理への入口を出さない", async () => {
    verifySession.mockResolvedValue({
      userId: "user-1",
      role: SESSION_ROLE.user,
      expiresAt: EXPIRES_AT,
    });

    const { container } = render(await AdminNavEntry({}));

    expect(container).toBeEmptyDOMElement();
  });

  it("未認証には管理への入口を出さない", async () => {
    const { container } = render(await AdminNavEntry({}));

    expect(container).toBeEmptyDOMElement();
  });

  it("a11y 違反を持たない", async () => {
    verifySession.mockResolvedValue({
      userId: "admin-1",
      role: SESSION_ROLE.admin,
      expiresAt: EXPIRES_AT,
    });

    const { container } = render(await AdminNavEntry({}));

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
