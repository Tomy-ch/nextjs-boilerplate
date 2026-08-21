// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MANAGED_USER_PAGE_MAX } from "@/adapters/server/api/users";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

vi.mock("./results", () => ({
  AdminUserResults: (props: { location: { scope: string; page: number }; perPage: number }) => (
    <output>{`${props.location.scope}:${props.location.page}:${props.perPage}`}</output>
  ),
}));

import { AdminUserListPageContent } from "./page-content";
import { ADMIN_USER_PAGE_SIZE } from "./page-size";
import { USER_SCOPE } from "./query";

const withdrawAction = () => Promise.resolve({ status: "idle" } as const);

function renderContent(searchParams: Record<string, string | string[] | undefined>) {
  return render(
    <AdminUserListPageContent searchParams={searchParams} withdrawAction={withdrawAction} />,
  );
}

describe("AdminUserListPageContent", () => {
  it("URL の条件を読んで、取り直す範囲へ渡す", async () => {
    renderContent({ scope: "withdrawn", page: "3" });

    expect(await screen.findByText(`withdrawn:3:${ADMIN_USER_PAGE_SIZE}`)).toBeInTheDocument();
  });

  it("条件が無ければ、すべての先頭ページとして読む", async () => {
    renderContent({});

    expect(
      await screen.findByText(`${USER_SCOPE.ALL}:1:${ADMIN_USER_PAGE_SIZE}`),
    ).toBeInTheDocument();
  });

  it("契約の上限を超えるページ番号は、取得へ届く前に先頭へ倒れる", async () => {
    renderContent({ page: String(MANAGED_USER_PAGE_MAX + 1) });

    expect(
      await screen.findByText(`${USER_SCOPE.ALL}:1:${ADMIN_USER_PAGE_SIZE}`),
    ).toBeInTheDocument();
  });

  it("絞り込みの欄は、取得を待たずに描かれる", () => {
    renderContent({ scope: "active" });

    expect(screen.getByRole("combobox", { name: "状態" })).toBeInTheDocument();
  });
});
