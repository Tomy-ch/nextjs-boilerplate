// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { type ActionState, failedActionState, succeededActionState } from "@/model/action-state";

const { removeCartItemAction } = vi.hoisted(() => ({
  removeCartItemAction:
    vi.fn<(previous: ActionState<void>, formData: FormData) => Promise<ActionState<void>>>(),
}));

vi.mock("../../actions", () => ({ removeCartItemAction }));

import {
  CartDisplayedOrder,
  CartRemovalNoticeProvider,
  useCartRemovalNotice,
} from "../../removal-memory";
import { CartRemoveButton } from "./remove-button";

const PRODUCT_ID = "0195f0c2-0000-7000-8000-000000000001";

/** 器へ届いた取り消しの記録と、覚えた並びを出す。 */
function NoticeProbe() {
  const notice = useCartRemovalNotice();

  return (
    <>
      <p data-testid="removed">
        {[...(notice?.removed.values() ?? [])]
          .map((line) => `${line.name}:${line.quantity}`)
          .join(",")}
      </p>
      <p data-testid="order">{(notice?.order ?? []).join(",")}</p>
    </>
  );
}

beforeEach(() => {
  removeCartItemAction.mockReset();
  removeCartItemAction.mockResolvedValue(succeededActionState(undefined));
});

describe("CartRemoveButton", () => {
  it("対象の名前を含む操作として読める", () => {
    render(<CartRemoveButton label="イヤホン" productId={PRODUCT_ID} quantity={2} />);

    expect(screen.getByRole("button", { name: "イヤホン を削除する" })).toBeVisible();
  });

  it("押すと対象の商品を送る", async () => {
    const user = userEvent.setup();

    render(<CartRemoveButton label="イヤホン" productId={PRODUCT_ID} quantity={2} />);
    await user.click(screen.getByRole("button"));

    const formData = removeCartItemAction.mock.calls.at(-1)?.[1];

    expect(formData?.get("productId")).toBe(PRODUCT_ID);
  });

  it("押した時点で、戻すために要る値を器へ知らせる", async () => {
    const user = userEvent.setup();

    render(
      <CartRemovalNoticeProvider>
        <CartRemoveButton label="イヤホン" productId={PRODUCT_ID} quantity={2} />
        <NoticeProbe />
      </CartRemovalNoticeProvider>,
    );
    await user.click(screen.getByRole("button", { name: "イヤホン を削除する" }));

    expect(screen.getByTestId("removed")).toHaveTextContent("イヤホン:2");
  });

  it("押した時点で、画面が並べていた順も一緒に知らせる", async () => {
    const user = userEvent.setup();

    render(
      <CartRemovalNoticeProvider>
        <CartDisplayedOrder order={[PRODUCT_ID, "p-9"]}>
          <CartRemoveButton label="イヤホン" productId={PRODUCT_ID} quantity={2} />
        </CartDisplayedOrder>
        <NoticeProbe />
      </CartRemovalNoticeProvider>,
    );
    await user.click(screen.getByRole("button", { name: "イヤホン を削除する" }));

    expect(screen.getByTestId("order")).toHaveTextContent(`${PRODUCT_ID},p-9`);
  });

  it("器を持たない場所でも削除そのものは通る", async () => {
    const user = userEvent.setup();

    render(<CartRemoveButton label="イヤホン" productId={PRODUCT_ID} quantity={2} />);
    await user.click(screen.getByRole("button"));

    expect(removeCartItemAction).toHaveBeenCalledOnce();
  });

  it("送信中は押せなくする", async () => {
    const user = userEvent.setup();
    let settle: (() => void) | undefined;

    removeCartItemAction.mockReturnValue(
      new Promise((resolve) => {
        settle = () => resolve(succeededActionState(undefined));
      }),
    );

    render(<CartRemoveButton label="イヤホン" productId={PRODUCT_ID} quantity={2} />);
    await user.click(screen.getByRole("button"));

    expect(await screen.findByRole("button", { name: "イヤホン を削除する" })).toBeDisabled();

    settle?.();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "イヤホン を削除する" })).toBeEnabled(),
    );
  });

  it("失敗したとき、その操作の隣に理由を出す", async () => {
    const user = userEvent.setup();

    removeCartItemAction.mockResolvedValue(
      failedActionState({ formError: "現在サービスを利用できません。" }),
    );

    render(<CartRemoveButton label="イヤホン" productId={PRODUCT_ID} quantity={2} />);
    await user.click(screen.getByRole("button"));

    expect(await screen.findByText("削除できませんでした")).toBeVisible();
    expect(screen.getByText("現在サービスを利用できません。")).toBeVisible();
  });

  it("送信していない間は失敗の文言を出さない", () => {
    render(<CartRemoveButton label="イヤホン" productId={PRODUCT_ID} quantity={2} />);

    expect(screen.queryByText("削除できませんでした")).not.toBeInTheDocument();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(
      <CartRemoveButton label="イヤホン" productId={PRODUCT_ID} quantity={2} />,
    );

    expect((await axe(container)).violations).toEqual([]);
  });
});
