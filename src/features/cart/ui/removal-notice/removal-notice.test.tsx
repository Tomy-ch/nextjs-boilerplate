// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ReactNode, useCallback } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { type ActionState, succeededActionState } from "@/model/action-state";

const { setCartItemQuantityAction } = vi.hoisted(() => ({
  setCartItemQuantityAction:
    vi.fn<(previous: ActionState<void>, formData: FormData) => Promise<ActionState<void>>>(),
}));

vi.mock("../../actions", () => ({ setCartItemQuantityAction }));

import {
  CartRemovalNoticeProvider,
  type RemovedCartLine,
  useCartRemovalNotice,
} from "../../removal-memory";
import { CartRemovalNotice, CartRemovalNoticeList } from "./removal-notice";

const EARPHONE: RemovedCartLine = { productId: "p-1", name: "ワイヤレスイヤホン", quantity: 2 };
const KEYBOARD: RemovedCartLine = { productId: "p-2", name: "キーボード", quantity: 1 };

/** 取り除きを器へ知らせる引き手。 */
function NotifyButton({ line }: { line: RemovedCartLine }) {
  const notice = useCartRemovalNotice();
  const notify = useCallback(() => notice?.notify(line, []), [notice, line]);

  return (
    <button type="button" onClick={notify}>
      {line.name}を取り除く
    </button>
  );
}

function withProvider(children: ReactNode) {
  return render(<CartRemovalNoticeProvider>{children}</CartRemovalNoticeProvider>);
}

beforeEach(() => {
  setCartItemQuantityAction.mockReset();
  setCartItemQuantityAction.mockResolvedValue(succeededActionState(undefined));
});

describe("CartRemovalNotice", () => {
  it("どの商品を取り除いたかを伝える", () => {
    render(<CartRemovalNotice removed={EARPHONE} />);

    expect(screen.getByText("ワイヤレスイヤホン を削除しました")).toBeVisible();
  });

  it("同時に並んでも区別できるよう、操作の名前に商品名を含める", () => {
    render(<CartRemovalNotice removed={EARPHONE} />);

    expect(screen.getByRole("button", { name: "ワイヤレスイヤホン をカートに戻す" })).toBeVisible();
  });

  it("押すと取り除いた時点の数量で入れ直す", async () => {
    const user = userEvent.setup();

    render(<CartRemovalNotice removed={EARPHONE} />);
    await user.click(screen.getByRole("button"));

    const formData = setCartItemQuantityAction.mock.calls.at(-1)?.[1];

    expect(formData?.get("productId")).toBe("p-1");
    expect(formData?.get("quantity")).toBe("2");
  });

  it("押しても自分からは消えない", async () => {
    const user = userEvent.setup();

    render(<CartRemovalNotice removed={EARPHONE} />);
    await user.click(screen.getByRole("button"));

    expect(screen.getByRole("button", { name: "ワイヤレスイヤホン をカートに戻す" })).toBeVisible();
  });

  it("読み上げへ割り込まずに知らせる", () => {
    render(<CartRemovalNotice removed={EARPHONE} />);

    expect(screen.getByRole("status")).toBeVisible();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<CartRemovalNotice removed={EARPHONE} />);

    expect((await axe(container)).violations).toEqual([]);
  });
});

describe("CartRemovalNoticeList", () => {
  it("戻せる明細が無いとき、何も出さない", () => {
    const { container } = withProvider(<CartRemovalNoticeList presentProductIds={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("戻せる明細を取り除いた順に積む", async () => {
    const user = userEvent.setup();

    withProvider(
      <>
        <NotifyButton line={EARPHONE} />
        <NotifyButton line={KEYBOARD} />
        <CartRemovalNoticeList presentProductIds={[]} />
      </>,
    );
    await user.click(screen.getByRole("button", { name: "ワイヤレスイヤホンを取り除く" }));
    await user.click(screen.getByRole("button", { name: "キーボードを取り除く" }));

    expect(screen.getAllByRole("status").map((notice) => notice.textContent)).toEqual([
      expect.stringContaining("ワイヤレスイヤホン"),
      expect.stringContaining("キーボード"),
    ]);
  });

  it("カートへ戻った明細を出さない", async () => {
    const user = userEvent.setup();

    withProvider(
      <>
        <NotifyButton line={EARPHONE} />
        <CartRemovalNoticeList presentProductIds={["p-1"]} />
      </>,
    );
    await user.click(screen.getByRole("button", { name: "ワイヤレスイヤホンを取り除く" }));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("器の外では何も出さない", () => {
    const { container } = render(<CartRemovalNoticeList presentProductIds={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
