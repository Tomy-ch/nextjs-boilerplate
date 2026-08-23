// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { failedActionState, succeededActionState } from "@/model/action-state";
import { PURCHASE_STATUS } from "@/model/purchase/purchase-status";

const { cancelPurchaseAction, payPurchaseAction } = vi.hoisted(() => ({
  cancelPurchaseAction: vi.fn(),
  payPurchaseAction: vi.fn(),
}));

vi.mock("../../../actions", () => ({ cancelPurchaseAction, payPurchaseAction }));

import { PURCHASE_DETAIL } from "../../../facade/purchase.fixture";
import { PurchaseTransitions } from "./transitions";

/** その状況の購入。個々のケースは状況だけを差し替える。 */
function purchaseWith(statusCode: number) {
  return { ...PURCHASE_DETAIL, statusCode };
}

/** 確認を開いて、その中の実行操作まで押す。 */
async function submit(user: ReturnType<typeof userEvent.setup>, label: string) {
  await user.click(screen.getByRole("button", { name: label }));

  const dialog = await screen.findByRole("alertdialog");

  await user.click(within(dialog).getByRole("button", { name: label }));
}

beforeEach(() => {
  vi.clearAllMocks();
  cancelPurchaseAction.mockResolvedValue(succeededActionState(undefined));
  payPurchaseAction.mockResolvedValue(succeededActionState(undefined));
});

describe("PurchaseTransitions", () => {
  it("注文を受けたばかりの購入には、支払いと取り消しを出す", () => {
    render(<PurchaseTransitions purchase={purchaseWith(PURCHASE_STATUS.UNPROCESSED)} />);

    expect(screen.getByRole("button", { name: "支払う" })).toBeVisible();
    expect(screen.getByRole("button", { name: "キャンセルする" })).toBeVisible();
  });

  it("支払いを終えた購入には、取り消しだけを出す", () => {
    render(<PurchaseTransitions purchase={purchaseWith(PURCHASE_STATUS.PAID)} />);

    expect(screen.queryByRole("button", { name: "支払う" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "キャンセルする" })).toBeVisible();
  });

  it("支払いを送ると、支払いの送信先だけを呼ぶ", async () => {
    const user = userEvent.setup();
    render(<PurchaseTransitions purchase={purchaseWith(PURCHASE_STATUS.UNPROCESSED)} />);

    await submit(user, "支払う");

    expect(payPurchaseAction).toHaveBeenCalled();
    expect(cancelPurchaseAction).not.toHaveBeenCalled();
  });

  it("成立したことを、操作が消えた後も伝える", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <PurchaseTransitions purchase={purchaseWith(PURCHASE_STATUS.UNPROCESSED)} />,
    );

    await submit(user, "キャンセルする");
    rerender(<PurchaseTransitions purchase={purchaseWith(PURCHASE_STATUS.CANCELED)} />);

    expect(await screen.findByText("キャンセルを受け付けました")).toBeVisible();
    expect(screen.queryByRole("button", { name: "キャンセルする" })).not.toBeInTheDocument();
  });

  it("支払いの成立と取り消しの成立を、別の知らせとして出す", async () => {
    const user = userEvent.setup();
    render(<PurchaseTransitions purchase={purchaseWith(PURCHASE_STATUS.UNPROCESSED)} />);

    await submit(user, "支払う");

    expect(await screen.findByText("お支払いを受け付けました")).toBeVisible();
    expect(screen.queryByText("キャンセルを受け付けました")).not.toBeInTheDocument();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(
      <PurchaseTransitions purchase={purchaseWith(PURCHASE_STATUS.UNPROCESSED)} />,
    );

    expect((await axe(container)).violations).toEqual([]);
  });

  it("届いた購入にできることが無ければ、段そのものを出さない", () => {
    const { container } = render(
      <PurchaseTransitions purchase={purchaseWith(PURCHASE_STATUS.DELIVERED)} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("知らない業務キーの購入にも、操作を出さない", () => {
    const { container } = render(<PurchaseTransitions purchase={purchaseWith(99)} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("通らなかったことは、成立の知らせとして出さない", async () => {
    const user = userEvent.setup();
    cancelPurchaseAction.mockResolvedValue(failedActionState({ formError: "通りませんでした。" }));
    render(<PurchaseTransitions purchase={purchaseWith(PURCHASE_STATUS.UNPROCESSED)} />);

    await submit(user, "キャンセルする");

    expect(await screen.findByText("通りませんでした。")).toBeVisible();
    expect(screen.queryByText("キャンセルを受け付けました")).not.toBeInTheDocument();
  });
});
