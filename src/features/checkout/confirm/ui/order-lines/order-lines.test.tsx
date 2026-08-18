// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { LONG_CART, ORDERABLE_CART } from "../../../checkout.fixture";
import { OrderLines } from "./order-lines";

describe("OrderLines", () => {
  // ----- 正常系 -----
  it("明細を並べ、総数を見出しに出す", () => {
    render(<OrderLines lines={ORDERABLE_CART.lines} />);

    expect(screen.getByText("ご注文内容（全 2 件）")).toBeVisible();
    expect(screen.getByText("ワイヤレスイヤホン")).toBeVisible();
  });

  it("直す手段としてカートへ戻す", () => {
    render(<OrderLines lines={ORDERABLE_CART.lines} />);

    expect(screen.getByRole("link", { name: "カートを修正する" })).toHaveAttribute("href", "/cart");
  });

  it("畳む数に届かなければ、開け閉めの操作を出さない", () => {
    render(<OrderLines lines={ORDERABLE_CART.lines} />);

    expect(screen.queryByRole("button", { name: /残り|折りたたむ/ })).not.toBeInTheDocument();
  });

  it("多い明細は 10 件で畳み、残りの数を操作に出す", () => {
    render(<OrderLines lines={LONG_CART.lines} />);

    expect(screen.getAllByRole("listitem")).toHaveLength(10);
    expect(screen.getByRole("button", { name: "残り 4 件を表示" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("開くと残りが出て、操作が畳む側へ変わる", async () => {
    render(<OrderLines lines={LONG_CART.lines} />);

    await userEvent.click(screen.getByRole("button", { name: "残り 4 件を表示" }));

    expect(screen.getAllByRole("listitem")).toHaveLength(14);
    expect(screen.getByRole("button", { name: "折りたたむ" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("もう一度押すと畳む", async () => {
    render(<OrderLines lines={LONG_CART.lines} />);

    await userEvent.click(screen.getByRole("button", { name: "残り 4 件を表示" }));
    await userEvent.click(screen.getByRole("button", { name: "折りたたむ" }));

    expect(screen.getAllByRole("listitem")).toHaveLength(10);
  });

  // ----- 異常系 -----
  it("明細が無くても総数を出す", () => {
    render(<OrderLines lines={[]} />);

    expect(screen.getByText("ご注文内容（全 0 件）")).toBeVisible();
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<OrderLines lines={LONG_CART.lines} />);

    expect((await axe(container)).violations).toEqual([]);
  });
});
