// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { PeriodCaption } from "./period-caption";

describe("PeriodCaption", () => {
  it("対象の暦日が決まっていなければその旨を出す", () => {
    render(<PeriodCaption />);

    expect(screen.getByText("集計する期間が決まっていません。")).toBeInTheDocument();
  });

  it("1 日だけを指すときは範囲の形にしない", () => {
    render(<PeriodCaption window={{ from: "2026-08-19", to: "2026-08-19" }} />);

    expect(screen.getByText("2026-08-19")).toBeInTheDocument();
    expect(screen.queryByText(/〜/)).not.toBeInTheDocument();
  });

  it("両端が違えば範囲として出す", () => {
    render(<PeriodCaption window={{ from: "2026-08-01", to: "2026-08-19" }} />);

    expect(screen.getByText("2026-08-01 〜 2026-08-19")).toBeInTheDocument();
  });

  it("日本時間の暦日であることを添える", () => {
    render(<PeriodCaption window={{ from: "2026-08-19", to: "2026-08-19" }} />);

    expect(screen.getByText(/日本時間の暦日/)).toBeInTheDocument();
  });

  it("a11y 検査を通る", async () => {
    const { container } = render(
      <PeriodCaption window={{ from: "2026-08-01", to: "2026-08-19" }} />,
    );

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
