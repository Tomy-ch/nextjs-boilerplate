import { beforeEach, describe, expect, it } from "vitest";

import { type CartLineInput, useCartStore } from "./cart-store";

const PRODUCT: CartLineInput = {
  productId: "0195f0c2-0000-7000-8000-000000000001",
  name: "深煎りブレンド",
  price: "12.34",
  statusName: "公開中",
  imageUrl: null,
  stockQuantity: 20,
};

const OTHER: CartLineInput = { ...PRODUCT, productId: "other", name: "浅煎りブレンド" };

describe("useCartStore", () => {
  beforeEach(() => {
    useCartStore.setState({ lines: [], isOpen: false });
  });

  // ----- 正常系 -----
  it("追加した商品を数量 1 の行にする", () => {
    useCartStore.getState().add(PRODUCT);

    expect(useCartStore.getState().lines).toEqual([{ ...PRODUCT, quantity: 1 }]);
  });

  it("同じ商品を追加しても行を増やさず数量を上げる", () => {
    useCartStore.getState().add(PRODUCT);
    useCartStore.getState().add(PRODUCT);

    expect(useCartStore.getState().lines).toHaveLength(1);
    expect(useCartStore.getState().lines[0]?.quantity).toBe(2);
  });

  it("別の商品は別の行にする", () => {
    useCartStore.getState().add(PRODUCT);
    useCartStore.getState().add(OTHER);

    expect(useCartStore.getState().lines.map((line) => line.productId)).toEqual([
      PRODUCT.productId,
      OTHER.productId,
    ]);
  });

  it("追加による数量の変化は対象の行だけに及ぶ", () => {
    useCartStore.getState().add(PRODUCT);
    useCartStore.getState().add(OTHER);
    useCartStore.getState().add(PRODUCT);

    expect(useCartStore.getState().lines.map((line) => line.quantity)).toEqual([2, 1]);
  });

  it("追加を受け付けたら中身を見たい状態にする", () => {
    useCartStore.getState().add(PRODUCT);

    expect(useCartStore.getState().isOpen).toBe(true);
  });

  it("中身を見たいかどうかを指定できる", () => {
    useCartStore.getState().setOpen(true);
    expect(useCartStore.getState().isOpen).toBe(true);

    useCartStore.getState().setOpen(false);

    expect(useCartStore.getState().isOpen).toBe(false);
  });

  it("数量を指定した値にする", () => {
    useCartStore.getState().add(PRODUCT);
    useCartStore.getState().setQuantity(PRODUCT.productId, 5);

    expect(useCartStore.getState().lines[0]?.quantity).toBe(5);
  });

  it("数量の変更は対象の行だけに及ぶ", () => {
    useCartStore.getState().add(PRODUCT);
    useCartStore.getState().add(OTHER);
    useCartStore.getState().setQuantity(OTHER.productId, 3);

    expect(useCartStore.getState().lines.map((line) => line.quantity)).toEqual([1, 3]);
  });

  it("行を取り除く", () => {
    useCartStore.getState().add(PRODUCT);
    useCartStore.getState().remove(PRODUCT.productId);

    expect(useCartStore.getState().lines).toEqual([]);
  });

  it("在庫が補充されていれば新しい在庫数を上限にする", () => {
    useCartStore.getState().add({ ...PRODUCT, stockQuantity: 1 });
    useCartStore.getState().add({ ...PRODUCT, stockQuantity: 3 });

    expect(useCartStore.getState().lines[0]?.quantity).toBe(2);
    expect(useCartStore.getState().lines[0]?.stockQuantity).toBe(3);
  });

  it("再追加すると価格や名前も新しい値へ差し替える", () => {
    useCartStore.getState().add(PRODUCT);
    useCartStore.getState().add({ ...PRODUCT, price: "9.99", name: "深煎りブレンド（新価格）" });

    expect(useCartStore.getState().lines[0]).toMatchObject({
      price: "9.99",
      name: "深煎りブレンド（新価格）",
      quantity: 2,
    });
  });

  it("在庫数を超える追加は数量を増やさない", () => {
    useCartStore.getState().add({ ...PRODUCT, stockQuantity: 2 });
    useCartStore.getState().add({ ...PRODUCT, stockQuantity: 2 });
    useCartStore.getState().add({ ...PRODUCT, stockQuantity: 2 });

    expect(useCartStore.getState().lines[0]?.quantity).toBe(2);
  });

  it("既に開いている状態で在庫が無い商品を追加しても開いたままにする", () => {
    useCartStore.getState().setOpen(true);

    useCartStore.getState().add({ ...PRODUCT, stockQuantity: 0 });

    expect(useCartStore.getState().isOpen).toBe(true);
  });

  it("在庫が無い商品の追加では中身を見たい状態にしない", () => {
    useCartStore.getState().add({ ...PRODUCT, stockQuantity: 0 });

    expect(useCartStore.getState().isOpen).toBe(false);
  });

  it("在庫が無い商品は追加しない", () => {
    useCartStore.getState().add({ ...PRODUCT, stockQuantity: 0 });

    expect(useCartStore.getState().lines).toEqual([]);
  });

  it("在庫数を超える数量の指定は在庫数で止める", () => {
    useCartStore.getState().add({ ...PRODUCT, stockQuantity: 3 });
    useCartStore.getState().setQuantity(PRODUCT.productId, 99);

    expect(useCartStore.getState().lines[0]?.quantity).toBe(3);
  });

  it("数量に 0 を指定した行は取り除く", () => {
    useCartStore.getState().add(PRODUCT);
    useCartStore.getState().setQuantity(PRODUCT.productId, 0);

    expect(useCartStore.getState().lines).toEqual([]);
  });

  it("数量に負の値を指定した行も取り除く", () => {
    useCartStore.getState().add(PRODUCT);
    useCartStore.getState().setQuantity(PRODUCT.productId, -1);

    expect(useCartStore.getState().lines).toEqual([]);
  });

  it("カートに無い商品の数量を変えても何も起きない", () => {
    useCartStore.getState().add(PRODUCT);
    useCartStore.getState().setQuantity("unknown", 9);

    expect(useCartStore.getState().lines).toEqual([{ ...PRODUCT, quantity: 1 }]);
  });

  it("カートに無い商品を取り除いても何も起きない", () => {
    useCartStore.getState().add(PRODUCT);
    useCartStore.getState().remove("unknown");

    expect(useCartStore.getState().lines).toHaveLength(1);
  });
});
