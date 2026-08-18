import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import type { ProductListItem } from "@/model/product/product";
import { toProductId } from "@/model/product/product";

import { ProductTeaser } from "./product-teaser";

const FRONT_IMAGE_URL = "/src/components/design-system/display/media-image/invertocat.png";

/**
 * 契約が許す最大長。`name` は 255（`src/adapters/gen/api/endpoints.zod.ts`）。
 */
const MAX_NAME_LENGTH = 255;

/** 折り返しの有無を見分けるため、区切りの無い長い語と日本語を混ぜる。 */
function longText(length: number): string {
  const unit = "超高性能ワイヤレスノイズキャンセリングイヤホン-第3世代-ProMaxUltraEdition-";

  return unit.repeat(Math.ceil(length / unit.length)).slice(0, length);
}

const ITEM: ProductListItem = {
  id: toProductId("0195f0c2-0000-7000-8000-000000000001"),
  name: "ワイヤレスイヤホン",
  price: "19.99",
  quantity: 12,
  categoryName: "オーディオ",
  statusName: "公開",
  imageUrl: FRONT_IMAGE_URL,
};

const meta = {
  title: "Features/Home/ProductTeaser",
  component: ProductTeaser,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: [
          "トップに並べる 1 件。分類・状態・在庫とカートへ入れる操作を持ちません。",
          "それらは候補を絞るために要る情報で、まだ何も探していない人には判断材料が積まれるだけです。",
        ].join(""),
      },
    },
  },
  args: { item: ITEM },
  decorators: [
    (Story) => (
      <div className="w-60">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ProductTeaser>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 画像のある商品。 */
export const Default: Story = {};

/** 画像の無い商品。代替画像を置き、枠の高さは変わらない。 */
export const WithoutImage: Story = {
  args: { item: { ...ITEM, imageUrl: null } },
};

/** 契約の上限まで名前が長い商品。2 行で切り、価格の位置を動かさない。 */
export const LongName: Story = {
  args: { item: { ...ITEM, name: longText(MAX_NAME_LENGTH) } },
};
