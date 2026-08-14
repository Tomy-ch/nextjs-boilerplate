// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import { SHORTCUT_MODIFIER, SHORTCUT_PLATFORM } from "./keyboard-shortcut.definition";
import { KeyboardShortcutKeys } from "./keyboard-shortcut-keys";

/** jsdom の `navigator.platform` は書き換えられないため、閲覧環境をここで差し替える。 */
function setPlatform(value: string): void {
  Object.defineProperty(window.navigator, "platform", { configurable: true, value });
}

function keyTexts(): string[] {
  return [...document.querySelectorAll("kbd kbd")].map((key) => key.textContent ?? "");
}

afterEach(() => {
  Reflect.deleteProperty(window.navigator, "platform");
});

describe("KeyboardShortcutKeys", () => {
  it("Apple 環境では修飾キーを記号で表示する", () => {
    setPlatform("MacIntel");

    render(<KeyboardShortcutKeys keys={[SHORTCUT_MODIFIER.MOD, "K"]} />);

    expect(keyTexts()).toEqual(["⌘", "K"]);
  });

  it("Apple 以外では修飾キーを語で表示する", () => {
    setPlatform("Win32");

    render(<KeyboardShortcutKeys keys={[SHORTCUT_MODIFIER.MOD, "K"]} />);

    expect(keyTexts()).toEqual(["Ctrl", "K"]);
  });

  it("platform を渡すと閲覧環境より優先する", () => {
    setPlatform("Win32");

    render(
      <KeyboardShortcutKeys
        keys={[SHORTCUT_MODIFIER.MOD, "K"]}
        platform={SHORTCUT_PLATFORM.APPLE}
      />,
    );

    expect(keyTexts()).toEqual(["⌘", "K"]);
  });

  it("修飾キー 4 種をプラットフォームごとの表記へ引く", () => {
    render(
      <KeyboardShortcutKeys
        keys={[
          SHORTCUT_MODIFIER.MOD,
          SHORTCUT_MODIFIER.ALT,
          SHORTCUT_MODIFIER.SHIFT,
          SHORTCUT_MODIFIER.CONTROL,
        ]}
        platform={SHORTCUT_PLATFORM.APPLE}
      />,
    );

    expect(keyTexts()).toEqual(["⌘", "⌥", "⇧", "⌃"]);
  });

  it("表記の変わらないキーは受け取った文字列のまま表示する", () => {
    render(<KeyboardShortcutKeys keys={["Enter", "k"]} platform={SHORTCUT_PLATFORM.OTHER} />);

    expect(keyTexts()).toEqual(["Enter", "k"]);
  });

  it("server 側では閲覧環境に関わらず Apple 以外の表記で描画する", () => {
    setPlatform("MacIntel");

    const markup = renderToStaticMarkup(
      <KeyboardShortcutKeys keys={[SHORTCUT_MODIFIER.MOD, "K"]} />,
    );

    expect(markup).toContain("Ctrl");
    expect(markup).not.toContain("⌘");
  });

  it("押す順のまとまりを一つの kbd として公開する", () => {
    render(
      <KeyboardShortcutKeys
        data-testid="keys"
        keys={[SHORTCUT_MODIFIER.MOD, "K"]}
        platform={SHORTCUT_PLATFORM.OTHER}
      />,
    );

    const group = screen.getByTestId("keys");

    expect(group.tagName).toBe("KBD");
    expect(group).toHaveAttribute("data-slot", "keyboard-shortcut-keys");
  });

  it("a11y 違反を持たない", async () => {
    const { container } = render(<KeyboardShortcutKeys keys={[SHORTCUT_MODIFIER.MOD, "K"]} />);

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
