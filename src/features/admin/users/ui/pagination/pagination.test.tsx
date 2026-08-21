// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { ADMIN_USER_LIST_PATH } from "../../../paths";
import { USER_SCOPE } from "../../query";
import { AdminUserPagination } from "./pagination";

function renderPagination(page: number, pageCount: number) {
  return render(
    <AdminUserPagination location={{ scope: USER_SCOPE.ALL, page }} pageCount={pageCount} />,
  );
}

describe("AdminUserPagination", () => {
  it("いま見ているページを現在地として示す", () => {
    renderPagination(2, 4);

    expect(screen.getByRole("link", { name: "2 ページ目" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "3 ページ目" })).not.toHaveAttribute("aria-current");
  });

  it("任意のページへ跳べる行き先を組む", () => {
    renderPagination(2, 4);

    expect(screen.getByRole("link", { name: "4 ページ目" })).toHaveAttribute(
      "href",
      `${ADMIN_USER_LIST_PATH}?page=4`,
    );
  });

  it("絞り込みを保ったまま移る", () => {
    render(
      <AdminUserPagination
        location={{ scope: USER_SCOPE.WITHDRAWN, page: 1 }}
        pageCount={3}
      />,
    );

    expect(screen.getByRole("link", { name: "3 ページ目" })).toHaveAttribute(
      "href",
      `${ADMIN_USER_LIST_PATH}?scope=withdrawn&page=3`,
    );
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

    expect(screen.getByRole("link", { name: "前のページ" })).toHaveAttribute(
      "href",
      ADMIN_USER_LIST_PATH,
    );
    expect(screen.getByRole("link", { name: "次のページ" })).toHaveAttribute(
      "href",
      `${ADMIN_USER_LIST_PATH}?page=3`,
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

  it("a11y 検査を通る", async () => {
    const { container } = renderPagination(6, 12);

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
