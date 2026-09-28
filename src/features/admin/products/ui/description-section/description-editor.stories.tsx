import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { SAMPLE_PRODUCT } from "../../products.fixture";
import { ProductDescriptionEditor } from "./description-editor";

const meta = {
  title: "Features/Admin/Products/DescriptionEditor",
  component: ProductDescriptionEditor,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "商品説明の編集面です。editor 一式は初期の一式から外してあり、**`active` になるまで読み込みを始めません**。",
          "届くまでは出来上がりと同じ高さの枠が置かれ、一度開いたら閉じません。",
        ].join(""),
      },
    },
  },
  args: {
    active: true,
    id: "create-description",
    label: "商品説明",
    defaultValue: "",
    onChange: fn(),
  },
  decorators: [(Story) => <div className="max-w-2xl">{Story()}</div>],
} satisfies Meta<typeof ProductDescriptionEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 開かれた直後。編集面が届き、まだ何も書かれていない。 */
export const Active: Story = {};

/** まだ開かれていない。出来上がりと同じ高さの枠だけを置き、届いた瞬間に下が動かないようにする。 */
export const Inactive: Story = {
  args: { active: false },
};

/** 保存済みの内容から開いた状態。編集面は開いた時点の内容からしか組み立てられない。 */
export const WithContent: Story = {
  args: {
    id: "edit-description",
    defaultValue: SAMPLE_PRODUCT.description ?? "",
  },
};
