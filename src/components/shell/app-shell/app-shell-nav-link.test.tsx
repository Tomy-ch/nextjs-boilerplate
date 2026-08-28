// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppShellNavLink } from "./app-shell-nav-link";

describe("AppShellNavLink", () => {
  it("遷移先と表示名を対にして描く", () => {
    render(<AppShellNavLink item={{ href: "/products", label: "商品" }} />);

    expect(screen.getByRole("link", { name: "商品" })).toHaveAttribute("href", "/products");
  });

  it("履歴を積まない指定でも同じ導線を描く", () => {
    render(<AppShellNavLink item={{ href: "/admin/products", label: "管理" }} replace />);

    expect(screen.getByRole("link", { name: "管理" })).toHaveAttribute("href", "/admin/products");
  });
});
