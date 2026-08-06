// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { CursorPagination } from "./cursor-pagination";

describe("CursorPagination", () => {
  it("名前を持つ navigation として公開する", () => {
    render(<CursorPagination nextHref="?after=abc" previousHref="?before=xyz" />);

    const nav = screen.getByRole("navigation", { name: "ページ送り" });

    expect(nav).toHaveAttribute("data-slot", "cursor-pagination");
  });

  it("ページ番号を持たず、前後の移動だけを並べる", () => {
    render(<CursorPagination nextHref="?after=abc" previousHref="?before=xyz" />);

    expect(screen.getAllByRole("link")).toHaveLength(2);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("行き先がある向きは href を持つ link になる", () => {
    render(<CursorPagination nextHref="?after=abc" previousHref="?before=xyz" />);

    expect(screen.getByRole("link", { name: "前へ" })).toHaveAttribute("href", "?before=xyz");
    expect(screen.getByRole("link", { name: "次へ" })).toHaveAttribute("href", "?after=abc");
  });

  it("先頭では前へが link ではなく操作できない control になる", () => {
    render(<CursorPagination nextHref="?after=abc" />);

    expect(screen.queryByRole("link", { name: "前へ" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "前へ" })).toBeDisabled();
  });

  it("末尾では次へが link ではなく操作できない control になる", () => {
    render(<CursorPagination previousHref="?before=xyz" />);

    expect(screen.queryByRole("link", { name: "次へ" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "次へ" })).toBeDisabled();
  });

  it("行き先が無くても要素は残り、位置が動かない", () => {
    render(<CursorPagination nextHref="?after=abc" />);

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("両方の行き先が無い場合も操作は並ぶ", () => {
    render(<CursorPagination />);

    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(screen.getByRole("button", { name: "前へ" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "次へ" })).toBeDisabled();
  });

  it("文言を差し替えるとアクセシブルな名前も変わる", () => {
    render(
      <CursorPagination
        nextHref="?after=abc"
        nextLabel="続きを読む"
        previousHref="?before=xyz"
        previousLabel="前の結果"
      />,
    );

    expect(screen.getByRole("link", { name: "前の結果" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "続きを読む" })).toBeInTheDocument();
  });

  it("aria-label で何の移動かを差し替えられる", () => {
    render(<CursorPagination aria-label="検索結果のページ送り" nextHref="?after=abc" />);

    expect(screen.getByRole("navigation", { name: "検索結果のページ送り" })).toBeInTheDocument();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(
      <CursorPagination nextHref="?after=abc" previousHref="?before=xyz" />,
    );

    const result = await axe(container, { rules: { "color-contrast": { enabled: false } } });

    expect(result.violations).toEqual([]);
  });
});
