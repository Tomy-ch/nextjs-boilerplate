// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { formatDateTime } from "@/model/datetime";

import { DiscontinuedState } from "./discontinued-state";

const DISCONTINUED_AT = new Date("2026-08-01T09:00:00.000Z");

describe("DiscontinuedState", () => {
  it("廃番済みであることを見出しで伝える", () => {
    render(<DiscontinuedState discontinuedAt={DISCONTINUED_AT} />);

    expect(screen.getByRole("heading", { name: "廃番済み" })).toBeInTheDocument();
  });

  it("廃番になった日時を、表示の形に直して出す", () => {
    render(<DiscontinuedState discontinuedAt={DISCONTINUED_AT} />);

    expect(
      screen.getByText(`この商品は ${formatDateTime(DISCONTINUED_AT)} に廃番になりました。`),
    ).toBeInTheDocument();
  });

  it("押せる操作を持たない", () => {
    const { container } = render(<DiscontinuedState discontinuedAt={DISCONTINUED_AT} />);

    expect(within(container).queryByRole("button")).not.toBeInTheDocument();
    expect(within(container).queryByRole("link")).not.toBeInTheDocument();
  });

  it("a11y 検査を通る", async () => {
    const { container } = render(<DiscontinuedState discontinuedAt={DISCONTINUED_AT} />);

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
