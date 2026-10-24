// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { toPageLinks } from "../../page-window";
import { OffsetPagination } from "./offset-pagination";

const LIST_PATH = "/admin/list";

function hrefOf(page: number) {
  return page === 1 ? LIST_PATH : `${LIST_PATH}?page=${page}`;
}

function renderPagination(page: number, pageCount: number) {
  return render(
    <OffsetPagination label="一覧のページ送り" links={toPageLinks(page, pageCount, hrefOf)} />,
  );
}

describe("OffsetPagination", () => {
  it("いま見ているページを現在地として示す", () => {
    renderPagination(2, 4);

    expect(screen.getByRole("link", { name: "2 ページ目" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "3 ページ目" })).not.toHaveAttribute("aria-current");
  });

  it("番号ごとに渡された行き先へ跳べる", () => {
    renderPagination(2, 4);

    expect(screen.getByRole("link", { name: "4 ページ目" })).toHaveAttribute(
      "href",
      `${LIST_PATH}?page=4`,
    );
  });

  it("渡された名前で読み上げる", () => {
    renderPagination(1, 4);

    expect(screen.getByRole("navigation", { name: "一覧のページ送り" })).toBeInTheDocument();
  });

  it("先頭では、前へを link にせず押せない状態で残す", () => {
    renderPagination(1, 4);

    expect(screen.queryByRole("link", { name: "前のページ" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "前のページ" })).toBeDisabled();
  });

  it("末尾では、次へを link にせず押せない状態で残す", () => {
    renderPagination(4, 4);

    expect(screen.queryByRole("link", { name: "次のページ" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "次のページ" })).toBeDisabled();
  });

  it("途中では前後のどちらへも進める", () => {
    renderPagination(2, 4);

    expect(screen.getByRole("link", { name: "前のページ" })).toHaveAttribute("href", LIST_PATH);
    expect(screen.getByRole("link", { name: "次のページ" })).toHaveAttribute(
      "href",
      `${LIST_PATH}?page=3`,
    );
  });

  it("1 ページしかなければ、前後のどちらも押せない", () => {
    renderPagination(1, 1);

    expect(screen.getByRole("button", { name: "前のページ" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "次のページ" })).toBeDisabled();
  });

  it("離れた範囲は省略の印で畳む", () => {
    renderPagination(6, 12);

    expect(screen.queryByRole("link", { name: "3 ページ目" })).not.toBeInTheDocument();
    expect(screen.getAllByText("省略されたページ")).toHaveLength(2);
  });

  it("省略の印を、渡された並びのとおり番号の間に置く", () => {
    render(
      <OffsetPagination
        label="一覧のページ送り"
        links={{
          entries: [
            { kind: "page", page: 1, href: LIST_PATH, current: false },
            { kind: "gap", after: 1 },
            { kind: "page", page: 5, href: `${LIST_PATH}?page=5`, current: true },
            { kind: "gap", after: 5 },
            { kind: "page", page: 9, href: `${LIST_PATH}?page=9`, current: false },
          ],
          previousHref: `${LIST_PATH}?page=4`,
          nextHref: `${LIST_PATH}?page=6`,
        }}
      />,
    );

    expect(
      screen
        .getAllByRole("listitem")
        .map((item) => (item.textContent?.includes("省略") ? "…" : item.textContent)),
    ).toEqual(["前へ", "1", "…", "5", "…", "9", "次へ"]);
  });

  it("a11y 検査を通る", async () => {
    const { container } = renderPagination(6, 12);

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
