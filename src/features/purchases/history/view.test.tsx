// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import type { PeriodSelection } from "./period";
import { PurchaseHistoryView } from "./view";

function renderView(period: PeriodSelection = { kind: "all" }) {
  return render(
    <PurchaseHistoryView period={period}>
      <p>一覧本体</p>
    </PurchaseHistoryView>,
  );
}

describe("PurchaseHistoryView", () => {
  it("受け取った一覧本体をそのまま置く", () => {
    renderView();

    expect(screen.getByText("一覧本体")).toBeVisible();
  });

  it("絞り込みを 2 つ置き、どちらも同じ期間を映す", () => {
    renderView({ kind: "recent", days: 7 });

    expect(screen.getByRole("form", { name: "購入履歴の絞り込み" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /期間: 直近 7 日/ })).toBeInTheDocument();
  });

  it("効いている条件を入力欄と別に並べない", () => {
    renderView({ kind: "recent", days: 7 });

    expect(screen.queryByRole("button", { name: /条件を外す|解除/ })).not.toBeInTheDocument();
  });

  it("パンくずを置かない", () => {
    renderView();

    expect(screen.queryByRole("navigation", { name: "パンくずリスト" })).not.toBeInTheDocument();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = renderView();

    expect((await axe(container)).violations).toEqual([]);
  });
});
