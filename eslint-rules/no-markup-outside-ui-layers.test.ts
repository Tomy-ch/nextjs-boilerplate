import { RuleTester } from "eslint";
import tseslint from "typescript-eslint";
import { describe, it } from "vitest";

import noMarkupOutsideUiLayers from "./no-markup-outside-ui-layers";

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

const MARKUP = "const view = <div>本文</div>;";

describe("noMarkupOutsideUiLayers", () => {
  // ----- 正常系 -----
  it("UI を置いてよい層のマークアップを通す", () => {
    ruleTester.run("no-markup-outside-ui-layers", noMarkupOutsideUiLayers, {
      valid: [
        { code: MARKUP, filename: "src/app/page.tsx" },
        { code: MARKUP, filename: "src/features/products/list/view.tsx" },
        { code: MARKUP, filename: "src/components/design-system/action/button/button.tsx" },
      ],
      invalid: [],
    });
  });

  it("層の外のファイルを通す", () => {
    ruleTester.run("no-markup-outside-ui-layers", noMarkupOutsideUiLayers, {
      valid: [
        // 層の直下ではないので、どの層にも属さない。
        { code: MARKUP, filename: "src/instrumentation.tsx" },
        // ワークスペースの中の src/。層と同じ形をしているが起点が違う。
        { code: MARKUP, filename: "docs-viewer/src/portal-app/portal-app.tsx" },
        { code: MARKUP, filename: "mocks/handlers.tsx" },
      ],
      invalid: [],
    });
  });

  it("UI を持たない層でも、Provider の合成は通す", () => {
    ruleTester.run("no-markup-outside-ui-layers", noMarkupOutsideUiLayers, {
      valid: [
        // React 19 の Provider。要素名は component と見分けが付かない。
        {
          code: "const p = <ThemeContext value={value}>{children}</ThemeContext>;",
          filename: "src/capabilities/theme.tsx",
        },
        // 旧来の書き方。
        {
          code: "const p = <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;",
          filename: "src/capabilities/theme.tsx",
        },
        // 断片だけを返す wrapper。マークアップを持たない。
        { code: "const p = <>{children}</>;", filename: "src/stores/selection.tsx" },
      ],
      invalid: [],
    });
  });

  it("UI を持たない層でも、JSX が無ければ通す", () => {
    ruleTester.run("no-markup-outside-ui-layers", noMarkupOutsideUiLayers, {
      valid: [
        {
          code: "export const spec = { path: '/products' };",
          filename: "src/adapters/server/api/products.ts",
        },
      ],
      invalid: [],
    });
  });

  it("UI を持たない層でも、テストのマークアップは通す", () => {
    ruleTester.run("no-markup-outside-ui-layers", noMarkupOutsideUiLayers, {
      valid: [
        { code: MARKUP, filename: "src/capabilities/use-media-query.test.tsx" },
        { code: MARKUP, filename: "src/stores/selection.test.jsx" },
      ],
      invalid: [],
    });
  });

  // ----- 異常系 -----
  it("UI を持たない層の host 要素を報告する", () => {
    ruleTester.run("no-markup-outside-ui-layers", noMarkupOutsideUiLayers, {
      valid: [],
      invalid: [
        {
          code: MARKUP,
          filename: "src/adapters/server/api/products.tsx",
          errors: [{ messageId: "noMarkupOutsideUiLayers" }],
        },
        {
          code: "const view = <ThemeContext value={value}><span>本文</span></ThemeContext>;",
          filename: "src/capabilities/theme.tsx",
          errors: [{ messageId: "noMarkupOutsideUiLayers" }],
        },
        {
          code: MARKUP,
          filename: "src/stores/selection.stories.tsx",
          errors: [{ messageId: "noMarkupOutsideUiLayers" }],
        },
      ],
    });
  });

  it("要素が幾つあってもファイルにつき 1 件だけ報告する", () => {
    ruleTester.run("no-markup-outside-ui-layers", noMarkupOutsideUiLayers, {
      valid: [],
      invalid: [
        {
          code: "const a = <div><span>子</span></div>; const b = <p>別</p>;",
          filename: "src/model/product/product.tsx",
          errors: [{ messageId: "noMarkupOutsideUiLayers" }],
        },
      ],
    });
  });
});
