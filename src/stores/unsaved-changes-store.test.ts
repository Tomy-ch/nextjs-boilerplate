import { beforeEach, describe, expect, it } from "vitest";

import { useUnsavedChangesStore } from "./unsaved-changes-store";

beforeEach(() => {
  useUnsavedChangesStore.setState({ hasUnsavedChanges: false });
});

describe("useUnsavedChangesStore", () => {
  // ----- 正常系 -----
  it("初期状態では書きかけが無い", () => {
    expect(useUnsavedChangesStore.getState().hasUnsavedChanges).toBe(false);
  });

  it("書きかけがあることを申告する", () => {
    useUnsavedChangesStore.getState().setUnsavedChanges(true);

    expect(useUnsavedChangesStore.getState().hasUnsavedChanges).toBe(true);
  });

  it("申告を取り下げる", () => {
    useUnsavedChangesStore.getState().setUnsavedChanges(true);
    useUnsavedChangesStore.getState().setUnsavedChanges(false);

    expect(useUnsavedChangesStore.getState().hasUnsavedChanges).toBe(false);
  });

  it("購読している側へ変化を伝える", () => {
    const seen: boolean[] = [];
    const unsubscribe = useUnsavedChangesStore.subscribe((state) =>
      seen.push(state.hasUnsavedChanges),
    );

    useUnsavedChangesStore.getState().setUnsavedChanges(true);
    useUnsavedChangesStore.getState().setUnsavedChanges(false);
    unsubscribe();

    expect(seen).toEqual([true, false]);
  });
});
