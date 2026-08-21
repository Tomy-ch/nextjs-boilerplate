// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import { toScopeHref, USER_SCOPE } from "./query";
import { AdminUserListView } from "./view";

describe("AdminUserListView", () => {
  it("一覧本体を受け取ってそのまま置く", () => {
    render(
      <AdminUserListView scope={USER_SCOPE.ALL}>
        <p>一覧の中身</p>
      </AdminUserListView>,
    );

    expect(screen.getByText("一覧の中身")).toBeInTheDocument();
  });

  it("絞り込みを、支援技術から辿れる領域にまとめる", () => {
    render(
      <AdminUserListView scope={USER_SCOPE.ALL}>
        <p>一覧の中身</p>
      </AdminUserListView>,
    );

    expect(screen.getByRole("region", { name: "利用者の絞り込み" })).toBeInTheDocument();
  });

  it("いま効いている範囲を選択欄へ渡す", () => {
    render(
      <AdminUserListView scope={USER_SCOPE.ACTIVE}>
        <p>一覧の中身</p>
      </AdminUserListView>,
    );

    expect(screen.getByRole("combobox", { name: "状態" })).toHaveValue(
      toScopeHref(USER_SCOPE.ACTIVE),
    );
  });

  it("a11y 検査を通る", async () => {
    const { container } = render(
      <AdminUserListView scope={USER_SCOPE.ALL}>
        <p>一覧の中身</p>
      </AdminUserListView>,
    );

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
