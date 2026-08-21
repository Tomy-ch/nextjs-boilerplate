// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { toUserId } from "@/model/user/user";

import type { AdminUserRow } from "../../row";
import { AdminUserTable } from "./table";

function row(overrides: Partial<AdminUserRow> = {}): AdminUserRow {
  return {
    id: toUserId("0195f0c2-0000-7000-8000-000000000001"),
    name: "山田 太郎",
    email: "yamada@example.com",
    phone: "09012345678",
    withdrawn: false,
    ...overrides,
  };
}

const WITHDRAWN = row({
  id: toUserId("0195f0c2-0000-7000-8000-000000000002"),
  name: "田中 二郎",
  email: "tanaka@example.com",
  withdrawn: true,
});

describe("AdminUserTable", () => {
  it("並べる利用者の名前・メール・電話番号を出す", () => {
    render(<AdminUserTable items={[row()]} onWithdraw={vi.fn()} />);

    expect(screen.getByText("山田 太郎")).toBeInTheDocument();
    expect(screen.getByText("yamada@example.com")).toBeInTheDocument();
    expect(screen.getByText("09012345678")).toBeInTheDocument();
  });

  it("状態を色ではなく文字で示す", () => {
    render(<AdminUserTable items={[row(), WITHDRAWN]} onWithdraw={vi.fn()} />);

    expect(screen.getByText("有効")).toBeInTheDocument();
    expect(screen.getByText("退会済み")).toBeInTheDocument();
  });

  it("行の操作は、どの行のものかが分かる名前を持つ", () => {
    render(<AdminUserTable items={[row()]} onWithdraw={vi.fn()} />);

    expect(screen.getByRole("button", { name: "山田 太郎 の操作" })).toBeInTheDocument();
  });

  it("退会済みの行には操作の trigger ごと出さない", () => {
    render(<AdminUserTable items={[row(), WITHDRAWN]} onWithdraw={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "田中 二郎 の操作" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "山田 太郎 の操作" })).toBeInTheDocument();
  });

  it("退会が選ばれたら、その行を呼び出し元へ渡す", async () => {
    const onWithdraw = vi.fn();

    render(<AdminUserTable items={[row()]} onWithdraw={onWithdraw} />);

    await userEvent.click(screen.getByRole("button", { name: "山田 太郎 の操作" }));
    await userEvent.click(
      await within(document.body).findByRole("menuitem", { name: "退会させる" }),
    );

    expect(onWithdraw).toHaveBeenCalledWith(row());
  });

  it("確認はここで出さない", async () => {
    render(<AdminUserTable items={[row()]} onWithdraw={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "山田 太郎 の操作" }));
    await userEvent.click(
      await within(document.body).findByRole("menuitem", { name: "退会させる" }),
    );

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("1 件も無ければ、表の形は保ったまま無いことを伝える", () => {
    render(<AdminUserTable items={[]} onWithdraw={vi.fn()} />);

    expect(screen.getByText("条件に一致する利用者はいません。")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "名前" })).toBeInTheDocument();
  });

  it("下に置くものを受け取って並べる", () => {
    render(<AdminUserTable items={[row()]} onWithdraw={vi.fn()} pagination={<p>ページ送り</p>} />);

    expect(screen.getByText("ページ送り")).toBeInTheDocument();
  });

  it("a11y 検査を通る", async () => {
    const { container } = render(
      <AdminUserTable items={[row(), WITHDRAWN]} onWithdraw={vi.fn()} />,
    );

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
