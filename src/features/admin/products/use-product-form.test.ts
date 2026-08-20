// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { failedActionState, idleActionState, succeededActionState } from "@/model/action-state";
import { useUnsavedChangesStore } from "@/stores/unsaved-changes-store";

import type { ProductFormState } from "./form-state";
import { useProductForm } from "./use-product-form";
import { emptyProductValues } from "./use-product-values";

beforeAll(() => {
  URL.createObjectURL = vi.fn(() => "blob:preview");
  URL.revokeObjectURL = vi.fn();
});

beforeEach(() => {
  useUnsavedChangesStore.setState({ hasUnsavedChanges: false });
});

const upload = vi.fn(() => Promise.resolve(succeededActionState("products/uploaded.png")));

function renderForm(state: ProductFormState = idleActionState()) {
  return renderHook(
    (current: ProductFormState) =>
      useProductForm({
        initialValues: emptyProductValues(),
        maxUploadBytes: 4 * 1024 * 1024,
        state: current,
        uploadAction: upload,
        withQuantity: true,
      }),
    { initialProps: state },
  );
}

describe("useProductForm", () => {
  // ----- 正常系 -----
  it("値・画像・弾いた理由をひとまとまりで返す", () => {
    const { result } = renderForm();

    expect(result.current.values.values.name).toBe("");
    expect(result.current.images.items).toEqual([]);
    expect(result.current.rejection.rejection).toBeUndefined();
  });

  it("本文を書き換えると値へ入る", () => {
    const { result } = renderForm();

    act(() => result.current.changeDescription("<p>説明</p>"));

    expect(result.current.values.values.description).toBe("<p>説明</p>");
  });

  it("入力が変われば書きかけとして器へ申告する", () => {
    const { result } = renderForm();

    act(() => result.current.values.setValue("name", "入れた"));

    expect(useUnsavedChangesStore.getState().hasUnsavedChanges).toBe(true);
  });

  // ----- 異常系 -----
  it("直前の結果は、下げるまで出したままにする", () => {
    const { result } = renderForm();

    expect(result.current.dismissed).toBe(false);
  });

  it("入力を直したら直前の結果を下げる", () => {
    const { result } = renderForm();

    act(() => result.current.dismiss());

    expect(result.current.dismissed).toBe(true);
  });

  it("本文を直したときも下げる", () => {
    const { result } = renderForm();

    act(() => result.current.changeDescription("<p>直した</p>"));

    expect(result.current.dismissed).toBe(true);
  });

  it("結果が入れ替わったら、下げた印を戻す。押しても何も起きない画面にしないため", () => {
    const { result, rerender } = renderForm();

    act(() => result.current.dismiss());
    rerender(failedActionState({ formError: "通らなかった" }));

    expect(result.current.dismissed).toBe(false);
  });

  it("結果が同じままなら、下げた印はそのまま残る", () => {
    const state = failedActionState<void>({ formError: "通らなかった" });
    const { result, rerender } = renderForm(state);

    act(() => result.current.dismiss());
    rerender(state);

    expect(result.current.dismissed).toBe(true);
  });
});
