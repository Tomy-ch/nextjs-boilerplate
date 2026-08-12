import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import type { ProductListItem } from "@/model/product/product";

import { ProductLoadMoreList } from "./load-more-list";

const meta = {
  title: "Features/Products/List/LoadMoreList",
  component: ProductLoadMoreList,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "読み進めた一覧の 4 つの見え方です。**取得は持たないので canvas では増えません。**",
          "件数に総数を添えないのは、契約が総件数を返さないためです。",
        ].join(""),
      },
    },
  },
} satisfies Meta<typeof ProductLoadMoreList>;

export default meta;
type Story = StoryObj<typeof meta>;

let seq = 0;

function item(overrides: Partial<ProductListItem> = {}): ProductListItem {
  seq += 1;

  return {
    id: `0195f0c2-0000-7000-8000-${String(seq).padStart(12, "0")}`,
    name: "ワイヤレスイヤホン",
    price: "19.99",
    quantity: 12,
    categoryName: "オーディオ",
    statusName: "公開",
    imageUrl: null,
    ...overrides,
  };
}

const ITEMS: readonly ProductListItem[] = [
  item(),
  item({ name: "スマートウォッチ", price: "129.00" }),
  item({ name: "USB-C ハブ", price: "45.50", quantity: 0, statusName: "在庫切れ" }),
];

/** 続きがある状態。末尾に近づけば自動で読むため、操作は出さない。 */
export const HasNext: Story = {
  args: { hasNext: true, items: ITEMS },
};

/** 続きを取得している最中。読み終えた分は残したまま、末尾で進行を示す。 */
export const Loading: Story = {
  args: { hasNext: true, items: ITEMS, loading: true },
};

/** 続きの取得に失敗した状態。ここでだけ読み直す操作を出す。末尾に留まったままでは自動で直らない。 */
export const Failed: Story = {
  args: { failed: true, hasNext: true, items: ITEMS },
};

/** 最後まで読み終えた状態。続きが無いので操作を出さない。 */
export const ReachedEnd: Story = {
  args: { hasNext: false, items: ITEMS },
};

/** 1 件も無い状態。件数は 0 のまま、空の案内を出す。 */
export const Empty: Story = {
  args: { hasNext: false, items: [] },
};
