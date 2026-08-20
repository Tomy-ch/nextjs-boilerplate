// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { useUnsavedChangesStore } from "@/stores/unsaved-changes-store";

import { useUnsavedChanges } from "./use-unsaved-changes";

beforeEach(() => {
  useUnsavedChangesStore.setState({ hasUnsavedChanges: false });
});

describe("useUnsavedChanges", () => {
  // ----- 正常系 -----
  it("書きかけがあることを器へ申告する", () => {
    renderHook(() => useUnsavedChanges(true));

    expect(useUnsavedChangesStore.getState().hasUnsavedChanges).toBe(true);
  });

  it("書きかけが無くなれば申告を取り下げる", () => {
    const { rerender } = renderHook((has: boolean) => useUnsavedChanges(has), {
      initialProps: true,
    });

    rerender(false);

    expect(useUnsavedChangesStore.getState().hasUnsavedChanges).toBe(false);
  });

  it("画面を離れるときは必ず取り下げる。次の画面が身に覚えのない確認を出さないため", () => {
    const { unmount } = renderHook(() => useUnsavedChanges(true));

    unmount();

    expect(useUnsavedChangesStore.getState().hasUnsavedChanges).toBe(false);
  });
});
