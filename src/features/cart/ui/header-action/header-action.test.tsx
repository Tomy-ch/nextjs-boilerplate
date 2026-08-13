// @vitest-environment jsdom

import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

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

type Listener = () => void;

/** jsdom は `matchMedia` を持たない。幅の想定をケースごとに明示するため、`it` ごとに置き換える。 */
function stubViewport(narrow: boolean) {
  const listeners = new Set<Listener>();
  const state = { matches: narrow };

  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: state.matches,
    media: query,
    addEventListener: (_: string, listener: Listener) => listeners.add(listener),
    removeEventListener: (_: string, listener: Listener) => listeners.delete(listener),
  }));

  return {
    resize(toNarrow: boolean) {
      state.matches = toNarrow;
      for (const listener of listeners) {
        listener();
      }
    },
  };
}

/** 初期状態を作る。追加が立てた「見たい」要求は種まきの副産物なので畳む。 */
function seed(line: CartLineInput) {
  useCartStore.getState().add(line);
  useCartStore.setState({ isOpen: false });
}

describe("CartHeaderAction", () => {
  beforeEach(() => {
    useCartStore.setState({ lines: [], isOpen: false });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ----- 正常系 -----
  it("広い幅では点数を持つ切り替えになり、中身は持たない", () => {
    stubViewport(false);
    seed(COFFEE);
    render(<CartHeaderAction />);
    const toggle = screen.getByRole("button", { name: "カートを開く" });

    expect(within(toggle).getByText("1")).toBeVisible();
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("深煎りブレンド")).not.toBeInTheDocument();
  });

  it("広い幅で押すと脇の領域を開く要求になる", async () => {
    stubViewport(false);
    seed(COFFEE);
    render(<CartHeaderAction />);

    await userEvent.click(screen.getByRole("button", { name: "カートを開く" }));

    expect(screen.getByRole("button", { name: "カートを閉じる" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("広い幅で開いている状態から押すと要求を畳む", async () => {
    stubViewport(false);
    useCartStore.getState().add(COFFEE);
    render(<CartHeaderAction />);

    await userEvent.click(screen.getByRole("button", { name: "カートを閉じる" }));

    expect(screen.getByRole("button", { name: "カートを開く" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("狭い幅では開く操作になる", () => {
    stubViewport(true);
    seed(COFFEE);
    render(<CartHeaderAction />);

    expect(screen.getByRole("button", { name: "カートを開く" })).toBeVisible();
  });

  it("狭い幅で押すとカートを被せて開く", async () => {
    stubViewport(true);
    seed(COFFEE);
    render(<CartHeaderAction />);

    await userEvent.click(screen.getByRole("button", { name: "カートを開く" }));

    expect(await screen.findByRole("dialog", { name: "カート" })).toBeVisible();
    expect(screen.getByText("1 点入っています。")).toBeVisible();
  });

  it("開いた状態で明細と小計を出す", async () => {
    stubViewport(true);
    seed(COFFEE);
    render(<CartHeaderAction />);

    await userEvent.click(screen.getByRole("button", { name: "カートを開く" }));

    expect(await screen.findByText("深煎りブレンド")).toBeVisible();
    expect(within(screen.getByRole("list")).getByText("$12.34")).toBeVisible();
  });

  it("閉じる操作で閉じる", async () => {
    stubViewport(true);
    seed(COFFEE);
    render(<CartHeaderAction />);

    await userEvent.click(screen.getByRole("button", { name: "カートを開く" }));
    await userEvent.click(await screen.findByRole("button", { name: "閉じる" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("中身を見たい要求が立っていれば最初から開く", async () => {
    stubViewport(true);
    useCartStore.getState().add(COFFEE);
    render(<CartHeaderAction />);

    expect(await screen.findByRole("dialog", { name: "カート" })).toBeVisible();
  });

  it("常設できる幅で立った要求は狭めた後も残る", async () => {
    const media = stubViewport(false);
    render(<CartHeaderAction />);
    act(() => useCartStore.getState().add(COFFEE));

    act(() => media.resize(true));

    expect(await screen.findByRole("dialog", { name: "カート" })).toBeVisible();
  });

  it("開いたまま常設できる幅へ移ると切り替えが開いた状態で引き継ぐ", async () => {
    const media = stubViewport(true);
    render(<CartHeaderAction />);
    act(() => useCartStore.getState().add(COFFEE));
    await screen.findByRole("dialog");

    act(() => media.resize(false));

    expect(screen.getByRole("button", { name: "カートを閉じる" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("狭い幅で畳んだ要求は広げて戻しても畳まれたまま", () => {
    const media = stubViewport(true);
    seed(COFFEE);
    render(<CartHeaderAction />);

    act(() => media.resize(false));
    act(() => media.resize(true));

    expect(screen.getByRole("button", { name: "カートを開く" })).toBeVisible();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("カートが空のときは入っていないことを伝える", async () => {
    stubViewport(true);
    render(<CartHeaderAction />);

    await userEvent.click(screen.getByRole("button", { name: "カートを開く" }));

    expect(await screen.findByText("商品が入っていません。")).toBeVisible();
  });
  it("閉じた状態が a11y 自動検査に違反しない", async () => {
    stubViewport(true);
    seed(COFFEE);
    const { container } = render(<CartHeaderAction />);

    expect((await axe(container)).violations).toEqual([]);
  });

  it("開いた状態が a11y 自動検査に違反しない", async () => {
    stubViewport(true);
    seed(COFFEE);
    const { container } = render(<CartHeaderAction />);

    await userEvent.click(screen.getByRole("button", { name: "カートを開く" }));
    await screen.findByRole("dialog", { name: "カート" });

    expect((await axe(container)).violations).toEqual([]);
  });
});
