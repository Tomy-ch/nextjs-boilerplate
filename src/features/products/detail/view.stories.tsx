import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import type { Product } from "@/model/product/product";

import { ProductDetail } from "./product-detail";

const FRONT_IMAGE_URL = "/src/components/design-system/display/media-image/invertocat.png";
const IMAGE_URLS = [FRONT_IMAGE_URL, "/next.svg", "/globe.svg"];

const meta = {
  title: "Features/Products/ProductDetail",
  component: ProductDetail,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "商品 1 件の詳細です。画像は枚数によらず carousel に載せ、送り先の一覧を必ず下に並べます。",
          "**送り操作は canvas でも効きます。** 一覧の追従は表示中の slide を観測するため、",
          "横スクロールさせると印が移ります。",
        ].join(""),
      },
    },
  },
} satisfies Meta<typeof ProductDetail>;

export default meta;
type Story = StoryObj<typeof meta>;

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: crypto.randomUUID(),
    name: "ワイヤレスイヤホン",
    description: "<p>ノイズキャンセリング対応。連続再生 30 時間。</p>",
    price: "19.99",
    quantity: 12,
    stockWarningThreshold: null,
    status: { id: "s1", name: "公開" },
    category: { id: "c1", name: "オーディオ" },
    publishedAt: new Date("2026-07-01T00:00:00.000Z"),
    imagePaths: ["earphone.png"],
    ...overrides,
  };
}

/** 既定。画像が複数あり、送り操作と一覧の両方が出る。 */
export const Default: Story = {
  args: { imageUrls: IMAGE_URLS, product: product() },
};

/** 画像が 1 枚の場合。一覧は出るが、送り先が無いので送り操作は出ない。 */
export const SingleImage: Story = {
  args: { imageUrls: [FRONT_IMAGE_URL], product: product() },
};

/** 画像が無い場合。代替画像を 1 枚として置く。 */
export const NoImage: Story = {
  args: { imageUrls: [], product: product({ imagePaths: [] }) },
};

/** 在庫が境界以下の場合。残りわずかであることを在庫の隣で示す。 */
export const LowStock: Story = {
  args: {
    imageUrls: IMAGE_URLS,
    product: product({ quantity: 2, stockWarningThreshold: 3 }),
  },
};

/** 在庫が無い場合。カートへ入れる操作を押せなくする。 */
export const OutOfStock: Story = {
  args: { imageUrls: IMAGE_URLS, product: product({ quantity: 0 }) },
};

/** 未公開の場合。公開日時は空欄ではなく未設定として示す。 */
export const Unpublished: Story = {
  args: {
    imageUrls: IMAGE_URLS,
    product: product({ description: null, publishedAt: null }),
  },
};
