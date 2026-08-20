// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { ATTACHMENT_STATE } from "@/components/app-starter/attachment/attachment.definition";
import { failedActionState, idleActionState, succeededActionState } from "@/model/action-state";

import type { ProductImageUploadState } from "./form-state";

import { useProductImages } from "./use-product-images";

beforeAll(() => {
  // jsdom は object URL を実装しないため、生涯の呼び出しだけを観測できるように補う。
  URL.createObjectURL = vi.fn(() => "blob:preview");
  URL.revokeObjectURL = vi.fn();
});

const SAVED = [{ imagePath: "products/saved.png", url: "/saved.png" }];

function fileOf(name: string) {
  return new File(["x"], name, { type: "image/png" });
}

/** 送るたびに違うキーを返す口。 */
function uploader() {
  let count = 0;

  return vi.fn(() => {
    count += 1;

    return Promise.resolve(succeededActionState(`products/uploaded-${count}.png`));
  });
}

describe("useProductImages", () => {
  // ----- 正常系 -----
  it("何も選ばれていなければ空から始まる", () => {
    const { result } = renderHook(() => useProductImages(uploader()));

    expect(result.current.items).toEqual([]);
    expect(result.current.imagePaths).toEqual([]);
  });

  it("保存済みの画像を最初から並べる", () => {
    const { result } = renderHook(() => useProductImages(uploader(), SAVED));

    expect(result.current.imagePaths).toEqual(["products/saved.png"]);
    expect(result.current.items[0]?.name).toBe("saved.png");
  });

  it("選んだ時点で送り、返ったキーを送信へ載せる", async () => {
    const upload = uploader();
    const { result } = renderHook(() => useProductImages(upload));

    act(() => result.current.add([fileOf("cover.png")]));

    await waitFor(() => expect(result.current.imagePaths).toEqual(["products/uploaded-1.png"]));
    expect(upload).toHaveBeenCalledTimes(1);
  });

  it("送り終わるまでは送信に載せない", () => {
    const pending = vi.fn(() => new Promise<ProductImageUploadState>(() => {}));
    const { result } = renderHook(() => useProductImages(pending));

    act(() => result.current.add([fileOf("cover.png")]));

    expect(result.current.items).toHaveLength(1);
    expect(result.current.imagePaths).toEqual([]);
    expect(result.current.uploading).toBe(true);
    // 表示状態まで見る。ここが失敗の状態にならないと、実際の画面では再試行が出ない。
    expect(result.current.items[0]).toMatchObject({
      description: "送信中",
      state: ATTACHMENT_STATE.UPLOADING,
    });
  });

  it("外した画像は送信からも消える", async () => {
    const { result } = renderHook(() => useProductImages(uploader(), SAVED));

    act(() => result.current.remove("products/saved.png"));

    expect(result.current.imagePaths).toEqual([]);
  });

  it("前後へ動かすと送信に載る並びも入れ替わる", async () => {
    const upload = uploader();
    const { result } = renderHook(() => useProductImages(upload));

    act(() => result.current.add([fileOf("first.png"), fileOf("second.png")]));
    await waitFor(() => expect(result.current.imagePaths).toHaveLength(2));

    const [, second] = result.current.items;
    act(() => result.current.moveUp(second?.id ?? ""));

    expect(result.current.imagePaths).toEqual([
      "products/uploaded-2.png",
      "products/uploaded-1.png",
    ]);
  });

  it("端の項目は、その先へ動かしても並びが変わらない", async () => {
    const { result } = renderHook(() => useProductImages(uploader(), SAVED));

    act(() => result.current.moveUp("products/saved.png"));
    act(() => result.current.moveDown("products/saved.png"));

    expect(result.current.imagePaths).toEqual(["products/saved.png"]);
  });

  it("読み込んだ時点から変わっていなければ書きかけではない", () => {
    const { result } = renderHook(() => useProductImages(uploader(), SAVED));

    expect(result.current.dirty).toBe(false);
  });

  it("顔ぶれが同じでも、並びが変われば書きかけになる", () => {
    // 長さの比較だけになっても他のケースは通る。並べ替えただけの人が警告なく変更を失う。
    const saved = [
      { imagePath: "products/a.png", url: "/a.png" },
      { imagePath: "products/b.png", url: "/b.png" },
    ];
    const { result } = renderHook(() => useProductImages(uploader(), saved));

    act(() => result.current.moveUp("products/b.png"));

    expect(result.current.imagePaths).toEqual(["products/b.png", "products/a.png"]);
    expect(result.current.dirty).toBe(true);
  });

  it("外せば書きかけになる", () => {
    const { result } = renderHook(() => useProductImages(uploader(), SAVED));

    act(() => result.current.remove("products/saved.png"));

    expect(result.current.dirty).toBe(true);
  });

  // ----- 異常系 -----
  it("送れなかった画像は理由を添えて残し、送信には載せない", async () => {
    const upload = vi.fn(() =>
      Promise.resolve(failedActionState<string>({ formError: "断られた" })),
    );
    const { result } = renderHook(() => useProductImages(upload));

    act(() => result.current.add([fileOf("cover.png")]));

    await waitFor(() => expect(result.current.items[0]?.description).toBe("断られた"));
    expect(result.current.imagePaths).toEqual([]);
    expect(result.current.uploading).toBe(false);
  });

  it("送信そのものが失敗しても、送信中のまま留まらせない", async () => {
    // 切断・上限超過・5xx は action の外で起きるため、戻り値では受け取れない。捕まえないと
    // その枚は送信中でも失敗でもない状態に居残り、送信が永久に塞がる。
    const upload = vi.fn(() => Promise.reject(new Error("切断")));
    const { result } = renderHook(() => useProductImages(upload));

    act(() => result.current.add([fileOf("cover.png")]));

    await waitFor(() => expect(result.current.failed).toBe(true));
    expect(result.current.uploading).toBe(false);
    expect(result.current.items[0]?.description).toBe("送信できませんでした。");
  });

  it("分類だけが返って文言が無くても、送れていないことを画面に出す", async () => {
    const upload = vi.fn(() => Promise.resolve(failedActionState<string>({ formError: null })));
    const { result } = renderHook(() => useProductImages(upload));

    act(() => result.current.add([fileOf("cover.png")]));

    await waitFor(() =>
      expect(result.current.items[0]?.description).toBe("送信できませんでした。"),
    );
  });

  it("結果そのものが付かない場合も、送れていないことを画面に出す", async () => {
    const upload = vi.fn(() => Promise.resolve(idleActionState<string>()));
    const { result } = renderHook(() => useProductImages(upload));

    act(() => result.current.add([fileOf("cover.png")]));

    await waitFor(() =>
      expect(result.current.items[0]?.description).toBe("送信できませんでした。"),
    );
  });

  it("送り直すと、載るところまで進む", async () => {
    let failing = true;
    const upload = vi.fn(() =>
      Promise.resolve(
        failing
          ? failedActionState<string>({ formError: "断られた" })
          : succeededActionState("products/ok.png"),
      ),
    );
    const { result } = renderHook(() => useProductImages(upload));

    act(() => result.current.add([fileOf("cover.png")]));
    await waitFor(() => expect(result.current.items[0]?.description).toBe("断られた"));

    failing = false;
    const [first] = result.current.items;
    act(() => result.current.retry(first?.id ?? ""));

    await waitFor(() => expect(result.current.imagePaths).toEqual(["products/ok.png"]));
  });

  it("送り直しても、隣の枚は巻き添えにしない", async () => {
    const upload = vi
      .fn()
      .mockResolvedValueOnce(succeededActionState("products/first.png"))
      .mockResolvedValueOnce(failedActionState<string>({ formError: "断られた" }))
      .mockResolvedValueOnce(succeededActionState("products/second.png"));
    const { result } = renderHook(() => useProductImages(upload));

    act(() => result.current.add([fileOf("first.png"), fileOf("second.png")]));
    await waitFor(() => expect(result.current.failed).toBe(true));

    const failedId = result.current.items[1]?.id ?? "";

    act(() => result.current.retry(failedId));

    await waitFor(() => expect(result.current.imagePaths).toHaveLength(2));
    expect(result.current.items[0]?.description).toBeUndefined();
  });

  it("一覧に無い画像を送り直そうとしても何も起こさない", () => {
    const upload = uploader();
    const { result } = renderHook(() => useProductImages(upload, SAVED));

    act(() => result.current.retry("products/none.png"));

    expect(upload).not.toHaveBeenCalled();
    expect(result.current.imagePaths).toEqual(["products/saved.png"]);
  });

  it("保存済みの画像は送り直さない。既にキーを持っているため", () => {
    const upload = uploader();
    const { result } = renderHook(() => useProductImages(upload, SAVED));

    act(() => result.current.retry("products/saved.png"));

    expect(upload).not.toHaveBeenCalled();
  });
});
