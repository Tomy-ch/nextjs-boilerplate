import { describe, expect, it } from "vitest";

import {
  isRichTextHrefAllowed,
  RICH_TEXT_EDITOR_BLOCK_ACTIONS,
  RICH_TEXT_EDITOR_COMMAND_ACTIONS,
  RICH_TEXT_EDITOR_EXTENSIONS,
  RICH_TEXT_EDITOR_MARK_ACTIONS,
} from "./rich-text-editor.definition";

describe("isRichTextHrefAllowed", () => {
  // ----- 正常系 -----
  it("allowlist の protocol を持つ URL を通す", () => {
    expect(isRichTextHrefAllowed("https://example.com")).toBe(true);
    expect(isRichTextHrefAllowed("http://example.com")).toBe(true);
    expect(isRichTextHrefAllowed("mailto:info@example.com")).toBe(true);
  });

  it("外部ホストへ解決される protocol-relative な URL を落とす", () => {
    expect(isRichTextHrefAllowed("//attacker.example.com")).toBe(false);
  });

  it("スラッシュの後ろに colon を持つ相対パスを通す", () => {
    expect(isRichTextHrefAllowed("path/10:30")).toBe(true);
  });

  it("protocol を持たない URL を通す", () => {
    expect(isRichTextHrefAllowed("/items/1")).toBe(true);
    expect(isRichTextHrefAllowed("#section")).toBe(true);
    expect(isRichTextHrefAllowed("?q=10:00")).toBe(true);
    expect(isRichTextHrefAllowed("items#10:00")).toBe(true);
  });

  it("allowlist 外の protocol を通さない", () => {
    expect(isRichTextHrefAllowed("javascript:alert(1)")).toBe(false);
    expect(isRichTextHrefAllowed("data:text/html,<script>alert(1)</script>")).toBe(false);
    expect(isRichTextHrefAllowed("tel:0000")).toBe(false);
  });
});

/** editor が実際に登録しているキー。extension が宣言したものを、押す組み合わせの集合として読む。 */
function registeredShortcuts(): ReadonlySet<string> {
  const found = new Set<string>();

  for (const extension of RICH_TEXT_EDITOR_EXTENSIONS) {
    const declare = extension.config.addKeyboardShortcuts;

    if (typeof declare !== "function") continue;

    // 返る object の鍵だけを読む。値の handler は呼ばないため、editor も type も空で足りる。
    const shortcuts: unknown = Reflect.apply(
      declare,
      {
        editor: {},
        name: extension.name,
        options: extension.options,
        parent: undefined,
        storage: {},
        type: {},
      },
      [],
    );

    if (typeof shortcuts !== "object" || shortcuts === null) continue;

    for (const key of Object.keys(shortcuts)) found.add(normalizeShortcut(key.split("-")));
  }

  return found;
}

/** 修飾キーの並び順と大文字小文字の違いを畳む。 */
function normalizeShortcut(keys: readonly string[]): string {
  const pressed = keys.map((key) => key.toLowerCase());
  const last = pressed.at(-1) ?? "";

  return [...pressed.slice(0, -1).sort(), last].join("+");
}

describe("RICH_TEXT_EDITOR_EXTENSIONS", () => {
  // ----- 正常系 -----
  it("toolbar が案内するキーをすべて登録している", () => {
    const registered = registeredShortcuts();
    const announced = [
      ...RICH_TEXT_EDITOR_MARK_ACTIONS,
      ...RICH_TEXT_EDITOR_BLOCK_ACTIONS,
      ...RICH_TEXT_EDITOR_COMMAND_ACTIONS,
    ].flatMap((action) =>
      action.shortcut === undefined ? [] : [[action.id, normalizeShortcut(action.shortcut)]],
    );

    // 案内している側を全部並べてから照合する。件数だけを見ると、宣言を消した変更が緑で通る。
    expect(announced.length).toBeGreaterThan(0);

    for (const [id, shortcut] of announced) {
      expect({ id, shortcut, registered: registered.has(shortcut ?? "") }).toEqual({
        id,
        shortcut,
        registered: true,
      });
    }
  });

  // ----- 異常系 -----
  it("登録していないキーは含まない", () => {
    const registered = registeredShortcuts();

    expect(registered.has(normalizeShortcut(["mod", "shift", "Q"]))).toBe(false);
  });
});
