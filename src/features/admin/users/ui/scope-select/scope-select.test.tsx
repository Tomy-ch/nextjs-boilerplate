// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { ADMIN_USER_LIST_PATH } from "../../../paths";
import { toScopeHref, USER_SCOPE } from "../../query";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { UserScopeSelect } from "./scope-select";

describe("UserScopeSelect", () => {
  beforeEach(() => {
    push.mockReset();
  });

  it("選べる範囲を 3 つ並べる", () => {
    render(<UserScopeSelect value={USER_SCOPE.ALL} />);

    expect(screen.getByRole("option", { name: "すべて" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "有効" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "退会済み" })).toBeInTheDocument();
  });

  it("いま効いている範囲を選択中として出す", () => {
    render(<UserScopeSelect value={USER_SCOPE.WITHDRAWN} />);

    expect(screen.getByRole("combobox", { name: "状態" })).toHaveValue(
      toScopeHref(USER_SCOPE.WITHDRAWN),
    );
  });

  it("選んだ時点で、その範囲の先頭ページへ移る", async () => {
    render(<UserScopeSelect value={USER_SCOPE.ALL} />);

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "状態" }), "有効");

    expect(push).toHaveBeenCalledWith(`${ADMIN_USER_LIST_PATH}?scope=active`);
  });

  it("すべてへ戻したときは、条件の無い住所へ移る", async () => {
    render(<UserScopeSelect value={USER_SCOPE.ACTIVE} />);

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "状態" }), "すべて");

    expect(push).toHaveBeenCalledWith(ADMIN_USER_LIST_PATH);
  });

  it("a11y 検査を通る", async () => {
    const { container } = render(<UserScopeSelect value={USER_SCOPE.ALL} />);

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
