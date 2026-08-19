// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { PurchaseFilterDraftProvider } from "../../filter-draft";
import type { PeriodSelection } from "../../period";
import { PurchasePeriodBar } from "./period-bar";

function renderBar(period: PeriodSelection = { kind: "all" }) {
  return render(
    <PurchaseFilterDraftProvider period={period}>
      <PurchasePeriodBar />
    </PurchaseFilterDraftProvider>,
  );
}

beforeEach(() => {
  push.mockClear();
});

describe("PurchasePeriodBar", () => {
  it("名前を持つ landmark として絞り込みを出す", () => {
    renderBar();

    expect(screen.getByRole("form", { name: "購入履歴の絞り込み" })).toBeInTheDocument();
  });

  it("効いている期間を入力欄が示す", () => {
    renderBar({ kind: "range", from: "2026-06-01", to: "2026-08-17" });

    expect(screen.getByLabelText("開始日")).toHaveValue("2026-06-01");
    expect(screen.getByLabelText("終了日")).toHaveValue("2026-08-17");
  });

  it("揃っているあいだは確定でき、足りない理由も出さない", () => {
    renderBar();

    expect(screen.getByRole("button", { name: "絞り込む" })).toBeEnabled();
    expect(screen.queryByText(/選ぶと絞り込めます/)).not.toBeInTheDocument();
  });

  it("足りていないあいだは確定を押せず、何が足りないかを添える", async () => {
    renderBar();
    await userEvent.click(screen.getByRole("radio", { name: "期間で指定" }));

    const submit = screen.getByRole("button", { name: "絞り込む" });

    expect(submit).toBeDisabled();
    expect(screen.getByText(/開始日と、それ以降の終了日を選ぶと絞り込めます/)).toBeVisible();
  });

  it("足りない理由を確定へ結び付ける", async () => {
    renderBar();
    await userEvent.click(screen.getByRole("radio", { name: "月で指定" }));

    const submit = screen.getByRole("button", { name: "絞り込む" });
    const hintId = submit.getAttribute("aria-describedby");

    expect(hintId).not.toBeNull();
    expect(document.getElementById(String(hintId))).toHaveTextContent("対象の月");
  });

  it("確定で、組み立てた期間の URL へ送る", async () => {
    renderBar();
    await userEvent.click(screen.getByRole("radio", { name: "直近" }));
    await userEvent.click(screen.getByRole("button", { name: "絞り込む" }));

    expect(push).toHaveBeenCalledWith("/purchases?period=recent&days=30");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = renderBar({ kind: "month", month: "2026-07" });

    expect((await axe(container)).violations).toEqual([]);
  });
});
