import { RuleTester } from "eslint";
import tseslint from "typescript-eslint";
import { describe, it } from "vitest";

import noJsxOutsideUiLayers from "./no-jsx-outside-ui-layers";

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

const VIEW = "const view = <div>本文</div>;";

describe("noJsxOutsideUiLayers", () => {
  // ----- 正常系 -----
  it("UI を置いてよい層の JSX を通す", () => {
    ruleTester.run("no-jsx-outside-ui-layers", noJsxOutsideUiLayers, {
      valid: [
        { code: VIEW, filename: "src/app/page.tsx" },
        { code: VIEW, filename: "src/features/products/list/view.tsx" },
        { code: VIEW, filename: "src/components/design-system/action/button/button.tsx" },
      ],
      invalid: [],
    });
  });

  it("層の外のファイルを通す", () => {
    ruleTester.run("no-jsx-outside-ui-layers", noJsxOutsideUiLayers, {
      valid: [
        // 層の直下ではないので、どの層にも属さない。
        { code: VIEW, filename: "src/instrumentation.tsx" },
        // ワークスペースの中の src/。層と同じ形をしているが起点が違う。
        { code: VIEW, filename: "docs-viewer/src/portal-app/portal-app.tsx" },
        { code: VIEW, filename: "mocks/handlers.tsx" },
      ],
      invalid: [],
    });
  });

  it("UI を持たない層でも、JSX が無ければ通す", () => {
    ruleTester.run("no-jsx-outside-ui-layers", noJsxOutsideUiLayers, {
      valid: [
        {
          code: "export const spec = { path: '/products' };",
          filename: "src/adapters/server/api/products.ts",
        },
      ],
      invalid: [],
    });
  });

  it("UI を持たない層でも、テストの JSX は通す", () => {
    ruleTester.run("no-jsx-outside-ui-layers", noJsxOutsideUiLayers, {
      valid: [
        { code: VIEW, filename: "src/capabilities/use-media-query.test.tsx" },
        { code: VIEW, filename: "src/stores/selection.test.jsx" },
      ],
      invalid: [],
    });
  });

  // ----- 異常系 -----
  it("UI を持たない層の JSX を報告する", () => {
    ruleTester.run("no-jsx-outside-ui-layers", noJsxOutsideUiLayers, {
      valid: [],
      invalid: [
        {
          code: VIEW,
          filename: "src/adapters/server/api/products.tsx",
          errors: [{ messageId: "noJsxOutsideUiLayers" }],
        },
        {
          code: "const view = <>本文</>;",
          filename: "src/capabilities/use-media-query.tsx",
          errors: [{ messageId: "noJsxOutsideUiLayers" }],
        },
        {
          code: VIEW,
          filename: "src/stores/selection.stories.tsx",
          errors: [{ messageId: "noJsxOutsideUiLayers" }],
        },
      ],
    });
  });

  it("要素が幾つあってもファイルにつき 1 件だけ報告する", () => {
    ruleTester.run("no-jsx-outside-ui-layers", noJsxOutsideUiLayers, {
      valid: [],
      invalid: [
        {
          code: "const a = <div><span>子</span></div>; const b = <p>別</p>;",
          filename: "src/model/product/product.tsx",
          errors: [{ messageId: "noJsxOutsideUiLayers" }],
        },
      ],
    });
  });
});
