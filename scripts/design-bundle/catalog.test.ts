import { describe, expect, it } from "vitest";

import {
  type BundleComponent,
  bundledFilesOf,
  itemTypeOf,
  renderCatalog,
  sectionOf,
  titleOf,
} from "./catalog";

const README = [
  "# Button",
  "",
  "## 用途",
  "",
  "利用者の操作を開始します。",
  "",
  "## 責務境界",
  "",
  "業務上の可否、送信中、結果通知は feature が管理します。",
  "",
  "## Storybook とテスト",
  "",
  "Storybook は variant を確認します。",
  "",
].join("\n");

function component(overrides: Partial<BundleComponent> = {}): BundleComponent {
  return {
    name: "button",
    title: "Button",
    layer: "design-system",
    as: "action",
    directory: "src/components/design-system/action/button",
    purpose: "利用者の操作を開始します。",
    boundary: "結果通知は feature が管理します。",
    files: ["src/components/design-system/action/button/button.tsx"],
    stories: [{ id: "action-button--default", name: "Default" }],
    ...overrides,
  };
}

describe("sectionOf", () => {
  it("指定した見出しの本文を 1 行へ畳んで返す", () => {
    expect(sectionOf(README, "用途")).toBe("利用者の操作を開始します。");
  });

  it("次の見出しより手前で切る", () => {
    expect(sectionOf(README, "責務境界")).toBe(
      "業務上の可否、送信中、結果通知は feature が管理します。",
    );
  });

  it("最後の見出しでも本文を取り出す", () => {
    expect(sectionOf(README, "Storybook とテスト")).toBe("Storybook は variant を確認します。");
  });

  it("複数行の本文を空白で繋ぐ", () => {
    const markdown = ["## 用途", "", "1 行目。", "2 行目。", ""].join("\n");

    expect(sectionOf(markdown, "用途")).toBe("1 行目。 2 行目。");
  });

  it("見出しが無ければ空文字を返す", () => {
    expect(sectionOf(README, "利用ケース")).toBe("");
  });
});

describe("titleOf", () => {
  it("先頭の見出しを表示名にする", () => {
    expect(titleOf(README, "button")).toBe("Button");
  });

  it("見出しが無ければ台帳の key を使う", () => {
    expect(titleOf("本文だけ", "button")).toBe("button");
  });
});

describe("itemTypeOf", () => {
  it("design-system は registry:ui になる", () => {
    expect(itemTypeOf("design-system")).toBe("registry:ui");
  });

  it("契約を前提にする層は registry:component になる", () => {
    expect(itemTypeOf("app-starter")).toBe("registry:component");
    expect(itemTypeOf("shell")).toBe("registry:component");
    expect(itemTypeOf("patterns")).toBe("registry:component");
  });
});

describe("bundledFilesOf", () => {
  it("実装ファイルを名前順で返す", () => {
    expect(bundledFilesOf(["button.tsx", "button.definition.ts"])).toEqual([
      "button.definition.ts",
      "button.tsx",
    ]);
  });

  it("test と README は載せない", () => {
    expect(bundledFilesOf(["button.tsx", "button.test.tsx", "gen.test.ts", "README.md"])).toEqual([
      "button.tsx",
    ]);
  });
});

describe("renderCatalog", () => {
  it("層ごとに見出しを立てて component を並べる", () => {
    const catalog = renderCatalog([
      component(),
      component({ name: "toaster", title: "Toaster", layer: "shell", as: "feedback" }),
    ]);

    expect(catalog).toContain("## design-system");
    expect(catalog).toContain("## shell");
    expect(catalog).toContain("### Button");
    expect(catalog).toContain("### Toaster");
  });

  it("用途・責務境界・story を載せる", () => {
    const catalog = renderCatalog([component()]);

    expect(catalog).toContain("- 用途: 利用者の操作を開始します。");
    expect(catalog).toContain("- 持たないもの: 結果通知は feature が管理します。");
    expect(catalog).toContain("- story: Default");
  });

  it("持たない項目は行ごと落とす", () => {
    const catalog = renderCatalog([component({ purpose: "", boundary: "", stories: [] })]);

    expect(catalog).not.toContain("- 用途:");
    expect(catalog).not.toContain("- 持たないもの:");
    expect(catalog).not.toContain("- story:");
  });

  it("同じ層の component は名前順に並べる", () => {
    const catalog = renderCatalog([
      component({ name: "toggle", title: "Toggle" }),
      component({ name: "badge", title: "Badge" }),
    ]);

    expect(catalog.indexOf("### Badge")).toBeLessThan(catalog.indexOf("### Toggle"));
  });

  it("参照が一方向であることを冒頭で伝える", () => {
    expect(renderCatalog([component()])).toContain("リポジトリへ自動で戻す経路はありません");
  });
});
