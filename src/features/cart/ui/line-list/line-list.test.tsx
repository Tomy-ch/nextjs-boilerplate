// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useCallback } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { succeededActionState } from "@/model/action-state";

const { setCartItemQuantityAction } = vi.hoisted(() => ({ setCartItemQuantityAction: vi.fn() }));

vi.mock("../../actions", () => ({ setCartItemQuantityAction }));

import {
  CartRemovalNoticeProvider,
  type RemovedCartLine,
  useCartRemovalNotice,
  useDisplayedOrder,
} from "../../removal-memory";
import { CartLineList, type CartLineSlot } from "./line-list";

const EARPHONE: RemovedCartLine = { productId: "p-1", name: "イヤホン", quantity: 2 };
const KEYBOARD: RemovedCartLine = { productId: "p-2", name: "キーボード", quantity: 1 };
const CABLE: RemovedCartLine = { productId: "p-3", name: "ケーブル", quantity: 1 };

/** 取り除きを器へ知らせる引き手。実物と同じく、並びの中から押される。 */
function NotifyButton({ line }: { line: RemovedCartLine }) {
  const notice = useCartRemovalNotice();
  const displayedOrder = useDisplayedOrder();
  const notify = useCallback(
    () => notice?.notify(line, displayedOrder),
    [notice, line, displayedOrder],
  );

  return (
    <button type="button" onClick={notify}>
      {line.name}を取り除く
    </button>
  );
}

/** 行 1 つぶんの差し込み。中身は server 側で組み立てたものを模す。 */
function slotOf(line: RemovedCartLine): CartLineSlot {
  return {
    productId: line.productId,
    row: (
      <li key={line.productId}>
        {line.name}
        <NotifyButton line={line} />
      </li>
    ),
  };
}

/** いま並んでいる行の文字列。 */
function rowTexts(): string[] {
  return screen.getAllByRole("listitem").map((row) => row.textContent ?? "");
}

beforeEach(() => {
  setCartItemQuantityAction.mockReset();
  setCartItemQuantityAction.mockResolvedValue(succeededActionState(undefined));
});

describe("CartLineList", () => {
  it("受け取った行を、渡された順に並べる", () => {
    render(<CartLineList slots={[slotOf(EARPHONE), slotOf(KEYBOARD)]} />);

    expect(rowTexts()).toEqual([
      expect.stringContaining("イヤホン"),
      expect.stringContaining("キーボード"),
    ]);
  });

  it("器の見た目を呼び出し元から受け取る", () => {
    render(<CartLineList className="border-y" slots={[slotOf(EARPHONE)]} />);

    expect(screen.getByRole("list")).toHaveClass("border-y");
  });

  it("行が 1 つも無いとき、空の器だけを出す", () => {
    render(<CartLineList slots={[]} />);

    expect(screen.getByRole("list")).toBeEmptyDOMElement();
  });

  it("取り除いた行の場所に、取り消しを差し込む", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <CartRemovalNoticeProvider>
        <CartLineList slots={[slotOf(EARPHONE), slotOf(KEYBOARD), slotOf(CABLE)]} />
      </CartRemovalNoticeProvider>,
    );

    await user.click(screen.getByRole("button", { name: "キーボードを取り除く" }));
    rerender(
      <CartRemovalNoticeProvider>
        <CartLineList slots={[slotOf(EARPHONE), slotOf(CABLE)]} />
      </CartRemovalNoticeProvider>,
    );

    expect(rowTexts()).toEqual([
      expect.stringContaining("イヤホン"),
      expect.stringContaining("キーボード を削除しました"),
      expect.stringContaining("ケーブル"),
    ]);
  });

  it("続けて取り除いても、それぞれの場所に取り消しを差し込む", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <CartRemovalNoticeProvider>
        <CartLineList slots={[slotOf(EARPHONE), slotOf(KEYBOARD), slotOf(CABLE)]} />
      </CartRemovalNoticeProvider>,
    );

    await user.click(screen.getByRole("button", { name: "イヤホンを取り除く" }));
    rerender(
      <CartRemovalNoticeProvider>
        <CartLineList slots={[slotOf(KEYBOARD), slotOf(CABLE)]} />
      </CartRemovalNoticeProvider>,
    );
    await user.click(screen.getByRole("button", { name: "キーボードを取り除く" }));
    rerender(
      <CartRemovalNoticeProvider>
        <CartLineList slots={[slotOf(CABLE)]} />
      </CartRemovalNoticeProvider>,
    );

    expect(rowTexts()).toEqual([
      expect.stringContaining("イヤホン を削除しました"),
      expect.stringContaining("キーボード を削除しました"),
      expect.stringContaining("ケーブル"),
    ]);
  });

  it("戻された明細を、取り消しではなく行として並べ直す", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <CartRemovalNoticeProvider>
        <CartLineList slots={[slotOf(EARPHONE), slotOf(KEYBOARD)]} />
      </CartRemovalNoticeProvider>,
    );

    await user.click(screen.getByRole("button", { name: "イヤホンを取り除く" }));
    rerender(
      <CartRemovalNoticeProvider>
        <CartLineList slots={[slotOf(KEYBOARD)]} />
      </CartRemovalNoticeProvider>,
    );
    rerender(
      <CartRemovalNoticeProvider>
        <CartLineList slots={[slotOf(EARPHONE), slotOf(KEYBOARD)]} />
      </CartRemovalNoticeProvider>,
    );

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(rowTexts()).toEqual([
      expect.stringContaining("イヤホン"),
      expect.stringContaining("キーボード"),
    ]);
  });

  it("器の外では、取り消しを差し込まずに行だけを並べる", async () => {
    const user = userEvent.setup();

    render(<CartLineList slots={[slotOf(EARPHONE)]} />);
    await user.click(screen.getByRole("button", { name: "イヤホンを取り除く" }));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(
      <CartRemovalNoticeProvider>
        <CartLineList slots={[slotOf(EARPHONE), slotOf(KEYBOARD)]} />
      </CartRemovalNoticeProvider>,
    );

    expect((await axe(container)).violations).toEqual([]);
  });
});
