import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { getDefaultErrorMeta } from "@/errors/error-catalog";
import { ErrorKind } from "@/errors/error-kind";

import { FILTER_KEY } from "../../query";
import { ProductInvalidQuery } from "./invalid-query";

const meta = {
  title: "Features/Products/List/InvalidQuery",
  component: ProductInvalidQuery,
  parameters: { layout: "padded" },
  args: { message: getDefaultErrorMeta(ErrorKind.INVALID_ARGUMENT).message, invalidKeys: [] },
} satisfies Meta<typeof ProductInvalidQuery>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 条件を特定できた場合。どれを直せばよいかを名前で示す。 */
export const SingleKey: Story = {
  args: { invalidKeys: [FILTER_KEY.CATEGORY] },
};

/** 複数の条件が外れている場合。 */
export const MultipleKeys: Story = {
  args: { invalidKeys: [FILTER_KEY.CATEGORY, FILTER_KEY.SORT, "first"] },
};

/** 条件を特定できなかった場合。名前の行を落とし、外す導線だけを残す。 */
export const NoKeys: Story = {};
