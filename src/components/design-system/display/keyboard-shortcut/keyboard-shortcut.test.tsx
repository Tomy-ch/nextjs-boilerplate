// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { KeyboardShortcut, KeyboardShortcutList } from "./keyboard-shortcut";
import { SHORTCUT_MODIFIER, SHORTCUT_PLATFORM } from "./keyboard-shortcut.definition";

function Fixture() {
  return (
    <KeyboardShortcutList data-testid="list">
      <KeyboardShortcut
        data-testid="shortcut"
        keys={[SHORTCUT_MODIFIER.MOD, "K"]}
        platform={SHORTCUT_PLATFORM.OTHER}
      >
        検索を開く
      </KeyboardShortcut>
      <KeyboardShortcut keys={["Escape"]} platform={SHORTCUT_PLATFORM.OTHER}>
        閉じる
      </KeyboardShortcut>
    </KeyboardShortcutList>
  );
}

describe("KeyboardShortcutList", () => {
  it("説明とキーの対を dl として並べる", () => {
    render(<Fixture />);

    const list = screen.getByTestId("list");

    expect(list.tagName).toBe("DL");
    expect(list).toHaveAttribute("data-slot", "keyboard-shortcut-list");
    expect(list.querySelectorAll("dt")).toHaveLength(2);
    expect(list.querySelectorAll("dd")).toHaveLength(2);
  });

  it("説明を dt、キーを dd として対応付ける", () => {
    render(<Fixture />);

    const shortcut = screen.getByTestId("shortcut");
    const term = shortcut.querySelector("dt");
    const detail = shortcut.querySelector("dd");

    expect(term).toHaveTextContent("検索を開く");
    expect(detail).toHaveTextContent("CtrlK");
  });

  it("キーを kbd 要素として表示する", () => {
    render(<Fixture />);

    const keys = screen
      .getByTestId("shortcut")
      .querySelectorAll("[data-slot='keyboard-shortcut-keys'] kbd");

    expect([...keys].map((key) => key.textContent)).toEqual(["Ctrl", "K"]);
  });

  it("表記の変わらないキーは受け取った文字列のまま表示する", () => {
    render(<Fixture />);

    expect(screen.getByText("Escape").tagName).toBe("KBD");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<Fixture />);

    const result = await axe(container, { rules: { "color-contrast": { enabled: false } } });

    expect(result.violations).toEqual([]);
  });
});

describe("KeyboardShortcut", () => {
  // ----- 正常系 -----
  it("shortcut 1 件として slot を持つ要素を描画する", () => {
    render(<Fixture />);

    expect(screen.getByTestId("shortcut")).toHaveAttribute("data-slot", "keyboard-shortcut");
  });

  it("説明とキーの両方を表示する", () => {
    render(<Fixture />);

    expect(screen.getByTestId("shortcut")).toHaveTextContent("検索を開く");
    expect(screen.getByTestId("shortcut")).toHaveTextContent("K");
  });
});
