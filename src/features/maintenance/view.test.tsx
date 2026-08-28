// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { MaintenanceView } from "./view";

describe("MaintenanceView", () => {
  it("止まっていることを見出しで伝える", () => {
    render(<MaintenanceView />);

    expect(screen.getByRole("heading", { name: "ただいまメンテナンス中です" })).toBeVisible();
  });

  it("いま利用できないことを本文で伝える", () => {
    render(<MaintenanceView />);

    expect(screen.getByText(/現在ご利用いただけません/)).toBeVisible();
  });

  it("押せる物を置かない", () => {
    render(<MaintenanceView />);

    expect(screen.queryAllByRole("link")).toEqual([]);
    expect(screen.queryAllByRole("button")).toEqual([]);
  });

  it("当たらない終了予定を出さない", () => {
    render(<MaintenanceView />);

    expect(screen.getByText(/終了の予定はお知らせしていません/)).toBeVisible();
    expect(screen.queryByText(/\d/)).not.toBeInTheDocument();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<MaintenanceView />);

    expect((await axe(container)).violations).toEqual([]);
  });
});
