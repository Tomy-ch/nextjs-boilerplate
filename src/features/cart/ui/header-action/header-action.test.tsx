// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type CartLineInput, useCartStore } from "@/stores/cart-store";
import { CartHeaderAction } from "./header-action";

const COFFEE: CartLineInput = {
  productId: "0195f0c2-0000-7000-8000-000000000001",
  name: "深煎りブレンド",
  price: "12.34",
  statusName: "公開中",
  imageUrl: null,
  stockQuantity: 20,
};

/** jsdom は `matchMedia` を持たない。幅の想定を story ごとに明示するため per-test で置く。 */
function stubViewport(narrow: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: narrow,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

describe("CartHeaderAction", () => {
  beforeEach(() => {
    useCartStore.setState({ lines: [] });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ----- 正常系 -----
  it("広い幅では点数だけを出し、開く操作を持たない", () => {
    stubViewport(false);
    useCartStore.getState().add(COFFEE);
    render(<CartHeaderAction />);

    expect(screen.getByText("カート")).toBeVisible();
    expect(screen.queryByRole("button", { name: "カートを開く" })).not.toBeInTheDocument();
  });

  it("狭い幅では開く操作になる", () => {
    stubViewport(true);
    useCartStore.getState().add(COFFEE);
    render(<CartHeaderAction />);

    expect(screen.getByRole("button", { name: "カートを開く" })).toBeVisible();
  });

  it("狭い幅で押すとカートを被せて開く", async () => {
    stubViewport(true);
    useCartStore.getState().add(COFFEE);
    render(<CartHeaderAction />);

    await userEvent.click(screen.getByRole("button", { name: "カートを開く" }));

    expect(await screen.findByRole("dialog", { name: "カート" })).toBeVisible();
    expect(screen.getByText("1 点入っています。")).toBeVisible();
  });

  it("開いた状態で明細と小計を出す", async () => {
    stubViewport(true);
    useCartStore.getState().add(COFFEE);
    render(<CartHeaderAction />);

    await userEvent.click(screen.getByRole("button", { name: "カートを開く" }));

    expect(await screen.findByText("深煎りブレンド")).toBeVisible();
    expect(within(screen.getByRole("list")).getByText("$12.34")).toBeVisible();
  });

  it("閉じる操作で閉じる", async () => {
    stubViewport(true);
    useCartStore.getState().add(COFFEE);
    render(<CartHeaderAction />);

    await userEvent.click(screen.getByRole("button", { name: "カートを開く" }));
    await userEvent.click(await screen.findByRole("button", { name: "閉じる" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("カートが空のときは入っていないことを伝える", async () => {
    stubViewport(true);
    render(<CartHeaderAction />);

    await userEvent.click(screen.getByRole("button", { name: "カートを開く" }));

    expect(await screen.findByText("商品が入っていません。")).toBeVisible();
  });
});
