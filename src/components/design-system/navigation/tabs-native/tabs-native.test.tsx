// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { TabsNative, TabsNativeLink, TabsNativeList } from "./tabs-native";

function Fixture() {
  return (
    <TabsNative aria-label="表示する観点">
      <TabsNativeList>
        <TabsNativeLink href="?view=summary" isActive>
          サマリ
        </TabsNativeLink>
        <TabsNativeLink href="?view=detail">明細</TabsNativeLink>
      </TabsNativeList>
    </TabsNative>
  );
}

describe("TabsNative", () => {
  it("名前を持つ navigation として公開する", () => {
    render(<Fixture />);

    const nav = screen.getByRole("navigation", { name: "表示する観点" });

    expect(nav).toHaveAttribute("data-slot", "tabs-native");
  });

  it("観点は link であり、tab role を使わない", () => {
    render(<Fixture />);

    expect(screen.getAllByRole("link")).toHaveLength(2);
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });

  it("項目数を伝えるため list として並べる", () => {
    render(<Fixture />);

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("移動先の URL を href として持つ", () => {
    render(<Fixture />);

    expect(screen.getByRole("link", { name: "明細" })).toHaveAttribute("href", "?view=detail");
  });

  it("現在の観点だけに aria-current を付ける", () => {
    render(<Fixture />);

    expect(screen.getByRole("link", { name: "サマリ" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "明細" })).not.toHaveAttribute("aria-current");
  });

  it("現在の観点は色だけでなく下線でも示す", () => {
    render(<Fixture />);

    expect(screen.getByRole("link", { name: "サマリ" })).toHaveClass("border-foreground");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<Fixture />);

    const result = await axe(container, { rules: { "color-contrast": { enabled: false } } });

    expect(result.violations).toEqual([]);
  });
});

describe("TabsNativeList", () => {
  it("並びの枠として slot を持つ要素を描画する", () => {
    const { container } = render(<Fixture />);

    expect(container.querySelector('[data-slot="tabs-native-list"]')).not.toBeNull();
  });
});

describe("TabsNativeLink", () => {
  it("遷移先を持つ link として描画する", () => {
    render(<Fixture />);

    const link = screen.getByRole("link", { name: "明細" });

    expect(link).toHaveAttribute("href", "?view=detail");
    expect(link).toHaveAttribute("data-slot", "tabs-native-link");
  });

  it("現在地の link に aria-current を付ける", () => {
    render(<Fixture />);

    expect(screen.getByRole("link", { name: "サマリ" })).toHaveAttribute("aria-current", "page");
  });
});
