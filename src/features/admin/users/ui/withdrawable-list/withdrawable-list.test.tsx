// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { ErrorKind } from "@/errors/error-kind";
import { failedActionState, succeededActionState } from "@/model/action-state";
import { toUserId } from "@/model/user/user";

import type { WithdrawUserState } from "../../form-state";
import type { AdminUserRow } from "../../row";
import { WithdrawableUserList } from "./withdrawable-list";

const ROW: AdminUserRow = {
  id: toUserId("0195f0c2-0000-7000-8000-000000000001"),
  name: "山田 太郎",
  email: "yamada@example.com",
  phone: "09012345678",
  withdrawn: false,
};

const idle = () => Promise.resolve<WithdrawUserState>({ status: "idle" });

function renderList(withdrawAction: () => Promise<WithdrawUserState> = idle) {
  return render(<WithdrawableUserList items={[ROW]} withdrawAction={withdrawAction} />);
}

async function confirmWithdraw() {
  await userEvent.click(screen.getByRole("button", { name: "山田 太郎 の操作" }));
  await userEvent.click(await within(document.body).findByRole("menuitem", { name: "退会させる" }));

  const dialog = await screen.findByRole("alertdialog");

  await userEvent.click(within(dialog).getByRole("button", { name: "退会させる" }));
}

describe("WithdrawableUserList", () => {
  it("送る前は結果を出さない", () => {
    renderList();

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("行から選んだ相手を確認の面へ渡す", async () => {
    renderList();

    await userEvent.click(screen.getByRole("button", { name: "山田 太郎 の操作" }));
    await userEvent.click(
      await within(document.body).findByRole("menuitem", { name: "退会させる" }),
    );

    expect(await screen.findByRole("alertdialog")).toHaveAccessibleName(
      "山田 太郎 を退会させますか？",
    );
  });

  it("成立したら確認を閉じ、結果を一覧の上に残す", async () => {
    renderList(() => Promise.resolve(succeededActionState({ name: "山田 太郎" })));

    await confirmWithdraw();

    expect(await screen.findByText("山田 太郎 を退会させました")).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("拒まれたときも確認を閉じ、理由を読める場所へ出す", async () => {
    renderList(() =>
      Promise.resolve(
        failedActionState({
          formError: "山田 太郎 は進行中の購入が残っています。",
          kind: ErrorKind.CONFLICT,
        }),
      ),
    );

    await confirmWithdraw();

    expect(await screen.findByText("山田 太郎 は進行中の購入が残っています。")).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("結果を伴わない応答では、確認を閉じない", async () => {
    // canvas は送信を起こさない送信先を渡す（`view.stories.tsx`）。押しても何も起きないことを、
    // 待ち続けない形で示すためで、そのとき確認は開いたままでなければならない。
    renderList(idle);

    await confirmWithdraw();

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("やめる操作では送らない", async () => {
    const withdrawAction = vi.fn(idle);

    renderList(withdrawAction);

    await userEvent.click(screen.getByRole("button", { name: "山田 太郎 の操作" }));
    await userEvent.click(
      await within(document.body).findByRole("menuitem", { name: "退会させる" }),
    );

    const dialog = await screen.findByRole("alertdialog");

    await userEvent.click(within(dialog).getByRole("button", { name: "やめる" }));

    expect(withdrawAction).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("下に置くページ送りをそのまま並べる", () => {
    render(
      <WithdrawableUserList items={[ROW]} pagination={<p>ページ送り</p>} withdrawAction={idle} />,
    );

    expect(screen.getByText("ページ送り")).toBeInTheDocument();
  });

  it("結果を出した状態で a11y 検査を通る", async () => {
    // 3 つの部品が合成された状態でだけ出る不整合を見るため、報せが出た後を検査する。
    const succeeding = () => Promise.resolve(succeededActionState({ name: "山田 太郎" }));
    const { container } = render(
      <WithdrawableUserList items={[ROW]} withdrawAction={succeeding} />,
    );

    await confirmWithdraw();
    await screen.findByText("山田 太郎 を退会させました");

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
