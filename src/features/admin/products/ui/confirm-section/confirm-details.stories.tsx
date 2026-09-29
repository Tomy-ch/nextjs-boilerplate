import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { CATEGORY_OPTIONS, SAMPLE_PRODUCT, STATUS_OPTIONS } from "../../products.fixture";
import { emptyProductValues, productValuesOf } from "../../use-product-values";
import { ProductConfirmDetails } from "./confirm-details";

const meta = {
  title: "Features/Admin/Products/ConfirmDetails",
  component: ProductConfirmDetails,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "確認の段の中身です。**入力欄を持たず**、識別子で選ばれた分類と状態は名前へ直して出します。空欄は「未入力」として出ます。",
          "説明は表示側と同じ経路（sanitize してから描く）を通るので、**ここで見えないものは保存しても表示されません。**",
        ].join(""),
      },
    },
  },
  args: {
    values: productValuesOf(SAMPLE_PRODUCT),
    categoryOptions: CATEGORY_OPTIONS,
    statusOptions: STATUS_OPTIONS,
    imageCount: 2,
  },
  decorators: [(Story) => <div className="max-w-2xl">{Story()}</div>],
} satisfies Meta<typeof ProductConfirmDetails>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 一通り埋まっている状態。説明は書いた形のまま出る。 */
export const Filled: Story = {};

/** 任意の項目を空のまま送ろうとしている状態。空欄は「未入力」として、画像と公開日時は何が起きるかを文言で見せる。 */
export const Empty: Story = {
  args: { values: emptyProductValues(), imageCount: 0 },
};

/** 説明に許されていない要素が混ざった状態。表示側で落ちるものは、ここでも見えない。 */
export const DisallowedMarkup: Story = {
  args: {
    values: {
      ...productValuesOf(SAMPLE_PRODUCT),
      description:
        '<h2>特長</h2><p>最長 30 時間の再生</p><script>alert("x")</script><iframe src="https://example.com"></iframe>',
    },
  },
};
