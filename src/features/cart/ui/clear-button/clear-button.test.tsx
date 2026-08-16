// @vitest-environment jsdom

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { failedActionState, succeededActionState } from "@/model/action-state";

const { clearCartAction } = vi.hoisted(() => ({ clearCartAction: vi.fn() }));

vi.mock("../../actions", () => ({ clearCartAction }));

import { CartClearButton } from "./clear-button";

/** 確認 dialog を開く。 */
async function open(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "カートを空にする" }));

  return screen.findByRole("alertdialog");
}

/** dialog の中の実行ボタン。開く前の trigger と名前が同じなので dialog の内側から引く。 */
function confirmButton(dialog: HTMLElement) {
  return within(dialog).getByRole("button", { name: "カートを空にする" });
}

beforeEach(() => {
  clearCartAction.mockReset();
  clearCartAction.mockResolvedValue(succeededActionState(undefined));
});

describe("CartClearButton", () => {
  it("既定では確認を開かない", () => {
    render(<CartClearButton />);

    expect(screen.getByRole("button", { name: "カートを空にする" })).toBeVisible();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("押すと、戻すには入れ直すことになると確認で伝える", async () => {
    const user = userEvent.setup();

    render(<CartClearButton />);
    const dialog = await open(user);

    expect(within(dialog).getByText("カートを空にしますか？")).toBeVisible();
    expect(within(dialog).getByText(/入れ直す/)).toBeVisible();
  });

  it("実行を submit にして、押した時点で dialog を閉じない", async () => {
    const user = userEvent.setup();

    render(<CartClearButton />);
    const dialog = await open(user);

    expect(confirmButton(dialog)).toHaveAttribute("type", "submit");
  });

  it("取り消しは送信せずに閉じる", async () => {
    const user = userEvent.setup();

    render(<CartClearButton />);
    const dialog = await open(user);
    await user.click(within(dialog).getByRole("button", { name: "キャンセル" }));

    expect(clearCartAction).not.toHaveBeenCalled();
  });

  it("実行するとカートを空にする要求を送る", async () => {
    const user = userEvent.setup();

    render(<CartClearButton />);
    const dialog = await open(user);
    await user.click(confirmButton(dialog));

    expect(clearCartAction).toHaveBeenCalledOnce();
  });

  it("送信中は押せなくなり、進行中であることを文言で示す", async () => {
    const user = userEvent.setup();
    let settle: (() => void) | undefined;

    clearCartAction.mockReturnValue(
      new Promise((resolve) => {
        settle = () => resolve(succeededActionState(undefined));
      }),
    );

    render(<CartClearButton />);
    const dialog = await open(user);
    await user.click(confirmButton(dialog));

    const pending = await within(dialog).findByRole("button", { name: "空にしています…" });

    expect(pending).toBeDisabled();

    settle?.();
    await waitFor(() =>
      expect(within(dialog).getByRole("button", { name: "カートを空にする" })).toBeEnabled(),
    );
  });

  it("失敗したとき、利用者が見ている場所へ理由を出す", async () => {
    const user = userEvent.setup();

    clearCartAction.mockResolvedValue(
      failedActionState({ formError: "現在サービスを利用できません。" }),
    );

    render(<CartClearButton />);
    const dialog = await open(user);
    await user.click(confirmButton(dialog));

    expect(await screen.findByText("カートを空にできませんでした")).toBeVisible();
    expect(screen.getByText("現在サービスを利用できません。")).toBeVisible();
  });

  it("送信していない間は失敗の文言を出さない", () => {
    render(<CartClearButton />);

    expect(screen.queryByText("カートを空にできませんでした")).not.toBeInTheDocument();
  });

  it("a11y 自動検査に違反しない", async () => {
    const user = userEvent.setup();
    const { baseElement } = render(<CartClearButton />);

    await open(user);

    expect((await axe(baseElement)).violations).toEqual([]);
  });
});
