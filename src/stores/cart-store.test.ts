import { beforeEach, describe, expect, it } from "vitest";

import { useCartStore } from "./cart-store";

beforeEach(() => {
  useCartStore.setState({ isOpen: false });
});

describe("useCartStore", () => {
  // ----- 正常系 -----
  it("初期状態では中身を見たい要求が立っていない", () => {
    expect(useCartStore.getState().isOpen).toBe(false);
  });

  it("要求を立てる", () => {
    useCartStore.getState().setOpen(true);

    expect(useCartStore.getState().isOpen).toBe(true);
  });

  it("要求を下ろす", () => {
    useCartStore.getState().setOpen(true);
    useCartStore.getState().setOpen(false);

    expect(useCartStore.getState().isOpen).toBe(false);
  });

  it("購読している側へ変化を伝える", () => {
    const seen: boolean[] = [];
    const unsubscribe = useCartStore.subscribe((state) => seen.push(state.isOpen));

    useCartStore.getState().setOpen(true);
    unsubscribe();

    expect(seen).toEqual([true]);
  });
});
