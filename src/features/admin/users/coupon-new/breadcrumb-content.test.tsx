// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { createAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";

import { ADMIN_USER_LIST_PATH } from "../../paths";
import { ISSUE_RECIPIENT } from "./coupon-new.fixture";

const { getManagedUser, logger } = vi.hoisted(() => ({
  getManagedUser: vi.fn(),
  logger: { warn: vi.fn() },
}));

vi.mock("@/adapters/server/api/users", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/adapters/server/api/users")>()),
  getManagedUser,
}));
vi.mock("@/logging/logging.server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/logging/logging.server")>()),
  getLogger: () => logger,
}));

import { AdminUserCouponNewBreadcrumbContent } from "./breadcrumb-content";

const ID = ISSUE_RECIPIENT.id;

function assemble() {
  return AdminUserCouponNewBreadcrumbContent({ id: ID });
}

function crumbs(): (string | null)[] {
  return screen.getAllByRole("listitem").map((item) => item.textContent);
}

beforeEach(() => {
  getManagedUser.mockReset();
  getManagedUser.mockResolvedValue({ lastName: "山田", firstName: "太郎" });
  logger.warn.mockReset();
  logger.warn.mockImplementation(() => undefined);
});

describe("AdminUserCouponNewBreadcrumbContent", () => {
  // ----- 利用者を読めたとき -----
  it("一覧・発行先の氏名・クーポンの発行の順に階層を出す", async () => {
    render(await assemble());

    expect(getManagedUser).toHaveBeenCalledExactlyOnceWith(ID);
    expect(crumbs()).toEqual(["利用者一覧", "山田 太郎", "クーポンの発行"]);
  });

  it("一覧への戻り先を利用者一覧へ向け、氏名とクーポンの発行は戻り先を持たない", async () => {
    render(await assemble());

    expect(screen.getByRole("link", { name: "利用者一覧" })).toHaveAttribute(
      "href",
      ADMIN_USER_LIST_PATH,
    );
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByText("クーポンの発行")).toHaveAttribute("aria-current", "page");
  });

  it("a11y 検査を通る", async () => {
    const { container } = render(await assemble());

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });

  // ----- 利用者が見つからないとき -----
  it("利用者が見つからなければ階層を出さず、記録は残さない", async () => {
    getManagedUser.mockRejectedValue(createAppError(ErrorKind.NOT_FOUND));

    const { container } = render(await assemble());

    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  // ----- 利用者を読めなかったとき -----
  it("見つからない以外の失敗では氏名を省いて階層を出し、読めなかったことを記録する", async () => {
    const failure = createAppError(ErrorKind.UNAVAILABLE);

    getManagedUser.mockRejectedValue(failure);

    render(await assemble());

    expect(crumbs()).toEqual(["利用者一覧", "クーポンの発行"]);
    expect(logger.warn).toHaveBeenCalledExactlyOnceWith("階層に出す利用者を読めませんでした", {
      cause: String(failure),
    });
  });

  it("記録そのものが失敗しても、階層を出す", async () => {
    getManagedUser.mockRejectedValue(new Error("接続できません"));
    logger.warn.mockImplementation(() => {
      throw new Error("記録できません");
    });

    render(await assemble());

    expect(crumbs()).toEqual(["利用者一覧", "クーポンの発行"]);
  });
});
