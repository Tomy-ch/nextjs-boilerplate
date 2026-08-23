// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { failedActionState, succeededActionState } from "@/model/action-state";

import { SHIPMENT_CONFLICT_MESSAGE } from "../../form-state";
import { MULTI_PURCHASE_GROUP, SINGLE_PURCHASE_GROUP } from "../../shipments.fixture";
import { DispatchGroupCard } from "./dispatch-group";

const shipAction = vi.fn();

/** 送信に載った購入コードを、届いた順に取り出す。 */
function submittedCodes(call: number): readonly string[] {
  const formData = shipAction.mock.calls[call]?.[1];

  return formData instanceof FormData ? formData.getAll("purchaseCode").map(String) : [];
}

beforeEach(() => {
  shipAction.mockReset();
  shipAction.mockResolvedValue(succeededActionState({ shipped: 1, refused: 0 }));
});

describe("DispatchGroupCard", () => {
  // ----- 正常系 -----
  it("便の鍵である宛先を、注文と見分けられる形で出す", () => {
    render(<DispatchGroupCard group={MULTI_PURCHASE_GROUP} shipAction={shipAction} />);

    expect(screen.getByText("宛先")).toBeVisible();
    expect(screen.getByText(MULTI_PURCHASE_GROUP.userId)).toBeVisible();
  });

  it("便に入っている注文を、契約が返した順で並べる", () => {
    render(<DispatchGroupCard group={MULTI_PURCHASE_GROUP} shipAction={shipAction} />);

    for (const purchase of MULTI_PURCHASE_GROUP.purchases) {
      expect(screen.getByText(purchase.code)).toBeVisible();
    }
  });

  it("行の操作は、その 1 件だけを送る", async () => {
    const user = userEvent.setup();
    render(<DispatchGroupCard group={MULTI_PURCHASE_GROUP} shipAction={shipAction} />);

    const [firstRowAction] = screen.getAllByRole("button", { name: "発送する" });

    if (firstRowAction === undefined) throw new Error("行の発送操作が見つかりません");

    await user.click(firstRowAction);

    expect(submittedCodes(0)).toEqual([MULTI_PURCHASE_GROUP.purchases[0]?.code]);
  });

  it("まとめる操作は、便の注文をすべて送る", async () => {
    const user = userEvent.setup();
    render(<DispatchGroupCard group={MULTI_PURCHASE_GROUP} shipAction={shipAction} />);

    await user.click(screen.getByRole("button", { name: "この便をまとめて発送" }));

    expect(submittedCodes(0)).toEqual(MULTI_PURCHASE_GROUP.purchases.map(({ code }) => code));
  });

  it("全件が通ったことを件数で伝える", async () => {
    const user = userEvent.setup();
    shipAction.mockResolvedValue(succeededActionState({ shipped: 3, refused: 0 }));
    render(<DispatchGroupCard group={MULTI_PURCHASE_GROUP} shipAction={shipAction} />);

    await user.click(screen.getByRole("button", { name: "この便をまとめて発送" }));

    expect(await screen.findByText("3 件を発送しました。")).toBeVisible();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(
      <DispatchGroupCard group={MULTI_PURCHASE_GROUP} shipAction={shipAction} />,
    );

    expect((await axe(container)).violations).toEqual([]);
  });

  // ----- 異常系 -----
  it("注文が 1 件しかない便では、まとめる操作を出さない", () => {
    render(<DispatchGroupCard group={SINGLE_PURCHASE_GROUP} shipAction={shipAction} />);

    expect(screen.queryByRole("button", { name: "この便をまとめて発送" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "発送する" })).toBeVisible();
  });

  it("途中まで通った送信を、通った件数と通らなかった件数の両方で伝える", async () => {
    const user = userEvent.setup();
    shipAction.mockResolvedValue(succeededActionState({ shipped: 2, refused: 1 }));
    render(<DispatchGroupCard group={MULTI_PURCHASE_GROUP} shipAction={shipAction} />);

    await user.click(screen.getByRole("button", { name: "この便をまとめて発送" }));

    expect(
      await screen.findByText("2 件を発送しました。1 件はいまの状況では発送できませんでした。"),
    ).toBeVisible();
  });

  it("1 件も通らなかったことを、拒まれた理由とともに伝える", async () => {
    const user = userEvent.setup();
    shipAction.mockResolvedValue(failedActionState({ formError: SHIPMENT_CONFLICT_MESSAGE }));
    render(<DispatchGroupCard group={MULTI_PURCHASE_GROUP} shipAction={shipAction} />);

    await user.click(screen.getByRole("button", { name: "この便をまとめて発送" }));

    expect(await screen.findByText("発送できませんでした")).toBeVisible();
    expect(screen.getByText(SHIPMENT_CONFLICT_MESSAGE)).toBeVisible();
  });

  it("文言の無い失敗では何も出さない", async () => {
    const user = userEvent.setup();
    shipAction.mockResolvedValue(failedActionState({ formError: null }));
    render(<DispatchGroupCard group={MULTI_PURCHASE_GROUP} shipAction={shipAction} />);

    await user.click(screen.getByRole("button", { name: "この便をまとめて発送" }));

    expect(screen.queryByText("発送できませんでした")).not.toBeInTheDocument();
  });
});
