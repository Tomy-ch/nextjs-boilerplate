import { describe, expect, it } from "vitest";

import {
  SHORTCUT_MODIFIER,
  SHORTCUT_PLATFORM,
  shortcutKeyLabel,
} from "./keyboard-shortcut.definition";

describe("shortcutKeyLabel", () => {
  // ----- 正常系 -----
  it("修飾キーを platform ごとの表記へ置き換える", () => {
    expect(shortcutKeyLabel(SHORTCUT_MODIFIER.MOD, SHORTCUT_PLATFORM.APPLE)).not.toBe(
      shortcutKeyLabel(SHORTCUT_MODIFIER.MOD, SHORTCUT_PLATFORM.OTHER),
    );
  });

  it("Apple では修飾キーごとに記号を返す", () => {
    expect(shortcutKeyLabel(SHORTCUT_MODIFIER.MOD, SHORTCUT_PLATFORM.APPLE)).toBe("⌘");
    expect(shortcutKeyLabel(SHORTCUT_MODIFIER.ALT, SHORTCUT_PLATFORM.APPLE)).toBe("⌥");
    expect(shortcutKeyLabel(SHORTCUT_MODIFIER.SHIFT, SHORTCUT_PLATFORM.APPLE)).toBe("⇧");
    expect(shortcutKeyLabel(SHORTCUT_MODIFIER.CONTROL, SHORTCUT_PLATFORM.APPLE)).toBe("⌃");
  });

  it("Apple 以外では mod と control を同じ Ctrl として綴る", () => {
    expect(shortcutKeyLabel(SHORTCUT_MODIFIER.MOD, SHORTCUT_PLATFORM.OTHER)).toBe("Ctrl");
    expect(shortcutKeyLabel(SHORTCUT_MODIFIER.CONTROL, SHORTCUT_PLATFORM.OTHER)).toBe("Ctrl");
  });

  it("修飾キーでないキーはそのまま返す", () => {
    expect(shortcutKeyLabel("K", SHORTCUT_PLATFORM.APPLE)).toBe("K");
    expect(shortcutKeyLabel("Escape", SHORTCUT_PLATFORM.OTHER)).toBe("Escape");
  });
});
