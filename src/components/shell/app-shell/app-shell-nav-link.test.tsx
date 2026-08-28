// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppShellNavLink } from "./app-shell-nav-link";

describe("AppShellNavLink", () => {
  it("遷移先と表示名を対にして描く", () => {
    render(<AppShellNavLink item={{ href: "/reports", label: "レポート" }} />);

    expect(screen.getByRole("link", { name: "レポート" })).toHaveAttribute("href", "/reports");
  });

  it("履歴を積まない指定でも同じ導線を描く", () => {
    render(<AppShellNavLink item={{ href: "/settings", label: "設定" }} replace />);

    expect(screen.getByRole("link", { name: "設定" })).toHaveAttribute("href", "/settings");
  });
});
