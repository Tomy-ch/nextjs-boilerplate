// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import type { PurchaseStatusCount } from "@/model/dashboard/dashboard";

import { StatusBars } from "./status-bars";

const COUNTS: readonly PurchaseStatusCount[] = [
  { statusId: "1", statusName: "検討中", count: 4 },
  { statusId: "2", statusName: "支払い済み", count: 2 },
];

describe("StatusBars", () => {
  // ----- 件数が無いとき -----
  it("行を 1 つも出さず、軸だけを残す", () => {
    render(<StatusBars counts={[]} />);

    expect(screen.queryByText("検討中")).not.toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  // ----- 件数があるとき -----
  it("受け取った順序のままステータス名を並べる", () => {
    render(<StatusBars counts={COUNTS} />);

    const labels = screen.getAllByText(/^(検討中|支払い済み)$/);

    expect(labels.map((label) => label.textContent)).toEqual(["検討中", "支払い済み"]);
  });

  it("軸の目盛りを 0 から並べる", () => {
    render(<StatusBars counts={COUNTS} />);

    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("目盛りを桁区切りで出す", () => {
    render(<StatusBars counts={[{ statusId: "1", statusName: "検討中", count: 4000 }]} />);

    expect(screen.getByText("4,000")).toBeInTheDocument();
  });

  it("先頭の目盛りだけは、指す位置へ寄せない", () => {
    render(<StatusBars counts={COUNTS} />);

    expect(screen.getByText("0")).not.toHaveStyle({ transform: "translateX(-50%)" });
    expect(screen.getByText("2")).toHaveStyle({ transform: "translateX(-50%)" });
  });

  it("末尾の目盛りは、軸の内側へ寄せる", () => {
    render(<StatusBars counts={COUNTS} />);

    expect(screen.getByText("4")).toHaveStyle({ transform: "translateX(-100%)" });
  });

  it("a11y 検査を通る", async () => {
    const { container } = render(<StatusBars counts={COUNTS} />);

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
