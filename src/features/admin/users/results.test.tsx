// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { toUserId } from "@/model/user/user";

const { getManagedUserPage } = vi.hoisted(() => ({ getManagedUserPage: vi.fn() }));

vi.mock("@/adapters/server/api/users", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/adapters/server/api/users")>()),
  getManagedUserPage,
}));

vi.mock("./ui/withdrawable-list/withdrawable-list", () => ({
  WithdrawableUserList: (props: {
    items: readonly { name: string }[];
    pagination?: React.ReactNode;
  }) => (
    <div>
      <output>{props.items.map((item) => item.name).join(",")}</output>
      {props.pagination}
    </div>
  ),
}));

import { USER_SCOPE } from "./query";
import { AdminUserResults } from "./results";

const withdrawAction = () => Promise.resolve({ status: "idle" } as const);

/** 呼び出し側が決める 1 ページの件数。 */
const PER_PAGE = 20;

function page(total: number) {
  return {
    items: [
      {
        id: toUserId("0195f0c2-0000-7000-8000-000000000001"),
        firstName: "太郎",
        lastName: "山田",
        email: "yamada@example.com",
        phone: "09012345678",
        deletedAt: null,
      },
    ],
    total,
    perPage: 20,
    offset: 0,
  };
}

describe("AdminUserResults", () => {
  beforeEach(() => {
    getManagedUserPage.mockReset();
    getManagedUserPage.mockResolvedValue(page(45));
  });

  it("いま見ている場所を取得の条件へ写す", async () => {
    render(
      await AdminUserResults({
        location: { scope: USER_SCOPE.ACTIVE, page: 2 },
        perPage: PER_PAGE,
        withdrawAction,
      }),
    );

    expect(getManagedUserPage).toHaveBeenCalledWith({ page: 2, perPage: PER_PAGE, active: true });
  });

  it("区別しない範囲では、絞り込みの条件そのものを送らない", async () => {
    render(
      await AdminUserResults({
        location: { scope: USER_SCOPE.ALL, page: 1 },
        perPage: PER_PAGE,
        withdrawAction,
      }),
    );

    expect(getManagedUserPage).toHaveBeenCalledWith({ page: 1, perPage: PER_PAGE });
  });

  it("取得した利用者を一覧の形へ写して渡す", async () => {
    render(
      await AdminUserResults({
        location: { scope: USER_SCOPE.ALL, page: 1 },
        perPage: PER_PAGE,
        withdrawAction,
      }),
    );

    expect(screen.getByText("山田 太郎")).toBeInTheDocument();
  });

  it("全件数から、跳べるページ数を導く", async () => {
    render(
      await AdminUserResults({
        location: { scope: USER_SCOPE.ALL, page: 1 },
        perPage: PER_PAGE,
        withdrawAction,
      }),
    );

    expect(screen.getByRole("link", { name: "3 ページ目" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "4 ページ目" })).not.toBeInTheDocument();
  });

  it("組み上がったページ送りが a11y 検査を通る", async () => {
    const { container } = render(
      await AdminUserResults({
        location: { scope: USER_SCOPE.ALL, page: 1 },
        perPage: PER_PAGE,
        withdrawAction,
      }),
    );

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });

  it("取得が失敗すれば、その失敗を境界へ渡す", async () => {
    getManagedUserPage.mockRejectedValue(new Error("取得に失敗しました"));

    await expect(
      AdminUserResults({
        location: { scope: USER_SCOPE.ALL, page: 1 },
        perPage: PER_PAGE,
        withdrawAction,
      }),
    ).rejects.toThrow("取得に失敗しました");
  });
});
