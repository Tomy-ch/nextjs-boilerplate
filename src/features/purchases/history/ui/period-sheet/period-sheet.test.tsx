// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { PurchaseFilterDraftProvider } from "../../filter-draft";
import type { PeriodSelection } from "../../period";
import { PurchasePeriodSheet } from "./period-sheet";

function renderSheet(period: PeriodSelection = { kind: "all" }) {
  return render(
    <PurchaseFilterDraftProvider period={period}>
      <PurchasePeriodSheet period={period} />
    </PurchaseFilterDraftProvider>,
  );
}

beforeEach(() => {
  push.mockClear();
});

describe("PurchasePeriodSheet", () => {
  it("全期間では、絞り込みを促す文言で開く操作を出す", () => {
    renderSheet();

    expect(screen.getByRole("button", { name: /期間で絞り込む/ })).toBeVisible();
  });

  it("効いている期間を、開く操作の文言そのものにする", () => {
    renderSheet({ kind: "recent", days: 30 });

    expect(screen.getByRole("button", { name: /期間: 直近 30 日/ })).toBeVisible();
  });

  it("開くと入力欄と、確定・全期間へ戻す操作を出す", async () => {
    renderSheet();
    await userEvent.click(screen.getByRole("button", { name: /期間で絞り込む/ }));

    expect(await screen.findByRole("dialog")).toBeVisible();
    expect(screen.getByRole("button", { name: "この期間で見る" })).toBeVisible();
    expect(screen.getByRole("button", { name: "全期間に戻す" })).toBeVisible();
  });

  it("足りていないあいだは確定を押せない", async () => {
    renderSheet();
    await userEvent.click(screen.getByRole("button", { name: /期間で絞り込む/ }));
    await userEvent.click(await screen.findByRole("radio", { name: "月で指定" }));

    expect(screen.getByRole("button", { name: "この期間で見る" })).toBeDisabled();
    expect(screen.getByText(/対象の月を選ぶと絞り込めます/)).toBeVisible();
  });

  it("全期間のままでは、全期間へ戻す操作を押せない", async () => {
    renderSheet();
    await userEvent.click(screen.getByRole("button", { name: /期間で絞り込む/ }));

    expect(await screen.findByRole("button", { name: "全期間に戻す" })).toBeDisabled();
  });

  it("全期間のまま区分だけ選び替えたら、全期間へ戻す操作を押せる", async () => {
    renderSheet();
    await userEvent.click(screen.getByRole("button", { name: /期間で絞り込む/ }));
    await userEvent.click(await screen.findByRole("radio", { name: "月で指定" }));

    expect(screen.getByRole("button", { name: "全期間に戻す" })).toBeEnabled();
  });

  it("確定で、組み立てた期間の URL へ送る", async () => {
    renderSheet();
    await userEvent.click(screen.getByRole("button", { name: /期間で絞り込む/ }));
    await userEvent.click(await screen.findByRole("radio", { name: "直近" }));
    await userEvent.click(screen.getByRole("button", { name: "この期間で見る" }));

    expect(push).toHaveBeenCalledWith("/purchases?period=recent&days=30");
  });

  it("全期間へ戻すと、条件の無い URL へ送る", async () => {
    renderSheet({ kind: "recent", days: 30 });
    await userEvent.click(screen.getByRole("button", { name: /期間: 直近 30 日/ }));
    await userEvent.click(await screen.findByRole("button", { name: "全期間に戻す" }));

    expect(push).toHaveBeenCalledWith("/purchases");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = renderSheet();

    expect((await axe(container)).violations).toEqual([]);
  });
});
