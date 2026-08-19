// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { DEFAULT_RECENT_DAYS } from "../../period-draft";
import { PurchasePeriodFields } from "./period-fields";

const EMPTY = { kind: "all", month: "", from: "", to: "", days: DEFAULT_RECENT_DAYS } as const;
const noop = () => undefined;

describe("PurchasePeriodFields", () => {
  it("区分をいつでも選べる形で出す", () => {
    render(<PurchasePeriodFields draft={EMPTY} onChange={noop} />);

    for (const label of ["全期間", "直近", "月で指定", "期間で指定"]) {
      expect(screen.getByRole("radio", { name: label })).toBeInTheDocument();
    }
  });

  it("全期間では追加の入力欄を出さない", () => {
    render(<PurchasePeriodFields draft={EMPTY} onChange={noop} />);

    expect(screen.queryByLabelText("対象の月")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("開始日")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("遡る日数")).not.toBeInTheDocument();
  });

  it("暦月では月の入力欄だけを出す", () => {
    render(<PurchasePeriodFields draft={{ ...EMPTY, kind: "month" }} onChange={noop} />);

    expect(screen.getByLabelText("対象の月")).toBeInTheDocument();
    expect(screen.queryByLabelText("開始日")).not.toBeInTheDocument();
  });

  it("期間では開始日と終了日を出し、終了日に開始日より前を選ばせない", () => {
    render(
      <PurchasePeriodFields
        draft={{ ...EMPTY, kind: "range", from: "2026-06-01" }}
        onChange={noop}
      />,
    );

    expect(screen.getByLabelText("開始日")).toHaveValue("2026-06-01");
    expect(screen.getByLabelText("終了日")).toHaveAttribute("min", "2026-06-01");
  });

  it("開始日がまだ無いあいだは終了日に下限を置かない", () => {
    render(<PurchasePeriodFields draft={{ ...EMPTY, kind: "range" }} onChange={noop} />);

    expect(screen.getByLabelText("終了日")).not.toHaveAttribute("min");
  });

  it("区分を選び替えたことを伝える", async () => {
    const onChange = vi.fn();

    render(<PurchasePeriodFields draft={EMPTY} onChange={onChange} />);
    await userEvent.click(screen.getByRole("radio", { name: "月で指定" }));

    expect(onChange).toHaveBeenCalledWith({ ...EMPTY, kind: "month" });
  });

  it("区分を跨いでも入力を捨てない", async () => {
    const onChange = vi.fn();
    const draft = { ...EMPTY, kind: "month", month: "2026-07" } as const;

    render(<PurchasePeriodFields draft={draft} onChange={onChange} />);
    await userEvent.click(screen.getByRole("radio", { name: "期間で指定" }));

    expect(onChange).toHaveBeenCalledWith({ ...draft, kind: "range" });
  });

  it("入れた日付を伝える", async () => {
    const onChange = vi.fn();

    render(<PurchasePeriodFields draft={{ ...EMPTY, kind: "range" }} onChange={onChange} />);
    await userEvent.type(screen.getByLabelText("開始日"), "2026-06-01");

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "range", from: "2026-06-01" }),
    );
  });

  it("選んだ日数を数として伝える", async () => {
    const onChange = vi.fn();

    render(<PurchasePeriodFields draft={{ ...EMPTY, kind: "recent" }} onChange={onChange} />);
    await userEvent.selectOptions(screen.getByLabelText("遡る日数"), "90");

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ kind: "recent", days: 90 }));
  });

  it("入れた月を伝える", async () => {
    const onChange = vi.fn();

    render(<PurchasePeriodFields draft={{ ...EMPTY, kind: "month" }} onChange={onChange} />);
    await userEvent.type(screen.getByLabelText("対象の月"), "2026-07");

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "month", month: "2026-07" }),
    );
  });

  it("入れた終了日を伝える", async () => {
    const onChange = vi.fn();

    render(<PurchasePeriodFields draft={{ ...EMPTY, kind: "range" }} onChange={onChange} />);
    await userEvent.type(screen.getByLabelText("終了日"), "2026-08-17");

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "range", to: "2026-08-17" }),
    );
  });

  it("知らない区分が届いても伝えない", () => {
    const onChange = vi.fn();

    render(<PurchasePeriodFields draft={EMPTY} onChange={onChange} />);

    const radio = screen.getByRole("radio", { name: "月で指定" });

    // 選択肢の値は KIND_OPTIONS から作られるため、画面の操作では起こらない。
    // URL や拡張から差し込まれた値が届いた場合に、そのまま流さないことを見る。
    radio.setAttribute("value", "yesterday");
    fireEvent.click(radio);

    expect(onChange).not.toHaveBeenCalled();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(
      <PurchasePeriodFields draft={{ ...EMPTY, kind: "range" }} onChange={noop} />,
    );

    expect((await axe(container)).violations).toEqual([]);
  });
});
