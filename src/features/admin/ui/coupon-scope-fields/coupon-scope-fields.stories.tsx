import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { userEvent, within } from "storybook/test";

import { toProductId } from "@/model/product/product";

import {
  COUPON_SCOPE_CATEGORY_MISSING_MESSAGE,
  COUPON_SCOPE_KIND_MISSING_MESSAGE,
  COUPON_SCOPE_PRODUCT_MISSING_MESSAGE,
  type CouponScopeValues,
  EMPTY_COUPON_SCOPE_VALUES,
} from "../../coupon-scope";
import { CouponScopeFields, type CouponScopeFieldsProps } from "./coupon-scope-fields";

const CATEGORY_OPTIONS = [
  { value: "5dd52d84-78eb-4a52-ba0b-2e11c95c2af2", label: "家電" },
  { value: "6ee63e95-89fc-4b63-cb1c-3f22d06d3b03", label: "雑貨" },
];

const PRODUCT_VALUES: CouponScopeValues = { ...EMPTY_COUPON_SCOPE_VALUES, kind: "product" };

/**
 * 値を持つ側として、本物と同じく `useState` で包む。
 *
 * @param props - 欄の props。`values` は最初の値として使う
 */
function Holder(props: CouponScopeFieldsProps) {
  const [values, setValues] = useState<CouponScopeValues>(props.values);

  return <CouponScopeFields {...props} onValuesChange={setValues} values={values} />;
}

/**
 * 商品の候補を開く。
 *
 * @param canvasElement - story の canvas
 */
async function openProducts(canvasElement: HTMLElement) {
  await userEvent.click(within(canvasElement).getByRole("button", { name: "商品" }));
  await within(document.body).findByRole("dialog");
}

const meta = {
  title: "Features/Admin/CouponScopeFields",
  component: CouponScopeFields,
  render: (args) => <Holder {...args} />,
  parameters: {
    layout: "padded",
    docs: {
      story: { inline: false, iframeHeight: 420 },
      description: {
        component: [
          "発行するクーポンが値引きの対象にする範囲です。対象の欄は種別に応じて 1 つだけ出ます。",
          "商品は名前で探して選びます。**探す取得はここに無く**、取得の状況を受け取って並べるだけです。",
        ].join(""),
      },
    },
  },
  args: {
    values: EMPTY_COUPON_SCOPE_VALUES,
    onValuesChange: () => undefined,
    categoryOptions: CATEGORY_OPTIONS,
    productCandidates: { status: "idle" },
    onProductSearchChange: () => undefined,
    messages: {},
  },
} satisfies Meta<typeof CouponScopeFields>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 何も選んでいない状態。種別だけが並ぶ。 */
export const Default: Story = {};

/** 全商品。対象の欄は出ない。 */
export const All: Story = { args: { values: { ...EMPTY_COUPON_SCOPE_VALUES, kind: "all" } } };

/** カテゴリで絞る。 */
export const Category: Story = {
  args: {
    values: {
      ...EMPTY_COUPON_SCOPE_VALUES,
      kind: "category",
      categoryId: "5dd52d84-78eb-4a52-ba0b-2e11c95c2af2",
    },
  },
};

/** 商品で絞り、選び終えた状態。 */
export const ProductSelected: Story = {
  args: {
    values: {
      ...PRODUCT_VALUES,
      productId: "0f4b2f2e-6a3f-4c4a-9e6e-2b1d8f2a1b11",
      productName: "ワイヤレスイヤホン",
    },
  },
};

/** 商品の候補が見つかった状態。先頭の件数だけを並べていることを添える。 */
export const ProductFound: Story = {
  args: {
    values: PRODUCT_VALUES,
    productCandidates: {
      status: "found",
      items: [
        { id: toProductId("0f4b2f2e-6a3f-4c4a-9e6e-2b1d8f2a1b11"), name: "ワイヤレスイヤホン" },
        { id: toProductId("0f4b2f2e-6a3f-4c4a-9e6e-2b1d8f2a1b12"), name: "ワイヤレス充電器" },
      ],
      hasMore: true,
    },
  },
  play: async ({ canvasElement }) => openProducts(canvasElement),
};

/** 商品を探している途中。 */
export const ProductSearching: Story = {
  args: { values: PRODUCT_VALUES, productCandidates: { status: "loading" } },
  play: async ({ canvasElement }) => openProducts(canvasElement),
};

/** 一致する商品が無い状態。 */
export const ProductNoMatch: Story = {
  args: {
    values: PRODUCT_VALUES,
    productCandidates: { status: "found", items: [], hasMore: false },
  },
  play: async ({ canvasElement }) => openProducts(canvasElement),
};

/** 候補を読み込めなかった状態。 */
export const ProductUnavailable: Story = {
  args: { values: PRODUCT_VALUES, productCandidates: { status: "unavailable" } },
  play: async ({ canvasElement }) => openProducts(canvasElement),
};

/** 選べるカテゴリが 1 つも無い状態。空の候補だけが並ぶ。 */
export const NoCategories: Story = {
  args: { values: { ...EMPTY_COUPON_SCOPE_VALUES, kind: "category" }, categoryOptions: [] },
};

/** 選ばずに進もうとした状態。 */
export const Invalid: Story = {
  args: { messages: { scopeKind: COUPON_SCOPE_KIND_MISSING_MESSAGE } },
};

/** 対象を選ばずに進もうとした状態（カテゴリと商品）。 */
export const TargetMissing: Story = {
  args: {
    values: { ...EMPTY_COUPON_SCOPE_VALUES, kind: "category" },
    messages: {
      scopeCategoryId: COUPON_SCOPE_CATEGORY_MISSING_MESSAGE,
      scopeProductId: COUPON_SCOPE_PRODUCT_MISSING_MESSAGE,
    },
  },
};
