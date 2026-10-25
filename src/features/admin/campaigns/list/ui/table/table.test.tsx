// @vitest-environment jsdom

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { ADMIN_CAMPAIGN_ROWS } from "../../list.fixture";
import type { AdminCampaignRow } from "../../row";
import { AdminCampaignTable } from "./table";

function fixtureRow(code: string): AdminCampaignRow {
  const row = ADMIN_CAMPAIGN_ROWS.find((item) => item.code === code);

  if (row === undefined) throw new Error(`fixture に ${code} がありません`);

  return row;
}

const UPCOMING = fixtureRow("SPRING2026");
const ACTIVE = fixtureRow("NEWYEAR2026");
const SUSPENDED = fixtureRow("FLASH1225");
const EXHAUSTED = fixtureRow("WINTERSALE");
const ENDED = fixtureRow("AUTUMN2025");

function rowOf(item: AdminCampaignRow) {
  return screen.getByRole("row", { name: new RegExp(item.code) });
}

describe("AdminCampaignTable", () => {
  // ----- 空のとき -----
  it("1 件も無ければ、表の領域は保ったまま無いことを伝える", () => {
    render(<AdminCampaignTable items={[]} onSuspend={vi.fn()} />);

    const region = screen.getByRole("region", { name: "キャンペーンの一覧" });

    expect(within(region).getByText("キャンペーンはまだありません。")).toBeInTheDocument();
    expect(within(region).getByRole("columnheader", { name: "コード" })).toBeInTheDocument();
  });

  // ----- 行があるとき -----
  it("配りきった行には、残り枚数に上限到達の語を添える", () => {
    render(<AdminCampaignTable items={[EXHAUSTED]} onSuspend={vi.fn()} />);

    expect(within(rowOf(EXHAUSTED)).getByText("上限到達")).toBeInTheDocument();
  });

  it("まだ残っている行には、上限到達の語を出さない", () => {
    render(<AdminCampaignTable items={[ENDED]} onSuspend={vi.fn()} />);

    expect(within(rowOf(ENDED)).queryByText("上限到達")).not.toBeInTheDocument();
  });

  it("残り枚数を、桁区切りした総枚数と並べて出す", () => {
    render(<AdminCampaignTable items={[ENDED]} onSuspend={vi.fn()} />);

    expect(within(rowOf(ENDED)).getByText("126 / 2,000")).toBeInTheDocument();
  });

  it("上限つきの値引きには、上限を添える", () => {
    render(<AdminCampaignTable items={[UPCOMING]} onSuspend={vi.fn()} />);

    const row = within(rowOf(UPCOMING));

    expect(row.getByText(UPCOMING.discount)).toBeInTheDocument();
    expect(row.getByText(String(UPCOMING.discountCap))).toBeInTheDocument();
  });

  it("上限の無い値引きには、上限を添えない", () => {
    render(<AdminCampaignTable items={[ENDED]} onSuspend={vi.fn()} />);

    const row = within(rowOf(ENDED));

    expect(row.getByText(ENDED.discount)).toBeInTheDocument();
    expect(row.queryByText(/^上限 /)).not.toBeInTheDocument();
  });

  it("停止した行には、停止日時を出す", () => {
    render(<AdminCampaignTable items={[SUSPENDED]} onSuspend={vi.fn()} />);

    const row = within(rowOf(SUSPENDED));

    expect(row.getByText(String(SUSPENDED.suspendedAt))).toBeInTheDocument();
    expect(row.queryByText("—")).not.toBeInTheDocument();
  });

  it("停止していない行の停止日時は、値が無い印にする", () => {
    render(<AdminCampaignTable items={[ACTIVE]} onSuspend={vi.fn()} />);

    expect(within(rowOf(ACTIVE)).getByText("—")).toBeInTheDocument();
  });

  it.each([
    { code: SUSPENDED.code, name: "停止" },
    { code: UPCOMING.code, name: "配布前" },
    { code: ACTIVE.code, name: "配布中" },
    { code: ENDED.code, name: "期間外" },
  ])("状態を文字で示し、$code の行には $name を出す", ({ code, name }) => {
    render(<AdminCampaignTable items={ADMIN_CAMPAIGN_ROWS} onSuspend={vi.fn()} />);

    expect(within(rowOf(fixtureRow(code))).getByText(name)).toBeInTheDocument();
  });

  it("停止した行には、操作の trigger ごと出さない", () => {
    render(<AdminCampaignTable items={[SUSPENDED, UPCOMING]} onSuspend={vi.fn()} />);

    expect(
      screen.queryByRole("button", { name: `${SUSPENDED.code} の操作` }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: `${UPCOMING.code} の操作` })).toBeInTheDocument();
  });

  it("停止が選ばれたら、その行を 1 度だけ呼び出し元へ渡す", async () => {
    const onSuspend = vi.fn();

    render(<AdminCampaignTable items={[UPCOMING, ACTIVE]} onSuspend={onSuspend} />);

    await userEvent.click(screen.getByRole("button", { name: `${UPCOMING.code} の操作` }));
    await userEvent.click(await within(document.body).findByRole("menuitem", { name: "停止する" }));

    await waitFor(() => expect(onSuspend).toHaveBeenCalledTimes(1));
    expect(onSuspend).toHaveBeenCalledWith(UPCOMING);
  });

  it("状態の混ざった表では、停止していない行にだけ操作を出す", () => {
    render(<AdminCampaignTable items={ADMIN_CAMPAIGN_ROWS} onSuspend={vi.fn()} />);

    const unsuspended = ADMIN_CAMPAIGN_ROWS.filter((item) => item.suspendedAt === null);
    const suspended = ADMIN_CAMPAIGN_ROWS.filter((item) => item.suspendedAt !== null);

    expect(screen.getAllByRole("button", { name: / の操作$/ })).toHaveLength(unsuspended.length);
    for (const item of unsuspended) {
      expect(screen.getByRole("button", { name: `${item.code} の操作` })).toBeInTheDocument();
    }
    for (const item of suspended) {
      expect(screen.queryByRole("button", { name: `${item.code} の操作` })).not.toBeInTheDocument();
    }
  });

  it("下に置くページ送りを受け取って並べる", () => {
    render(
      <AdminCampaignTable
        items={[UPCOMING]}
        onSuspend={vi.fn()}
        pagination={<nav aria-label="ページ送り" />}
      />,
    );

    expect(screen.getByRole("navigation", { name: "ページ送り" })).toBeInTheDocument();
  });

  it("a11y 検査を通る", async () => {
    const { container } = render(
      <AdminCampaignTable items={ADMIN_CAMPAIGN_ROWS} onSuspend={vi.fn()} />,
    );

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
