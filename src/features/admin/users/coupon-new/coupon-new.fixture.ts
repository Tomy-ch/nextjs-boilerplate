import { toUserId } from "@/model/user/user";

import type { CouponDiscountValues } from "../../coupon-discount";
import type { CouponScopeValues } from "../../coupon-scope";
import type { AdminSelectOption } from "../../ui/select-field/select-field";
import type { IssueOwnValues } from "./issue-rules";
import type { IssueRecipient } from "./recipient";

const MAX_NAME_LENGTH = 100;

function longText(length: number): string {
  const unit = "長谷川ヴィクトリア-Bartholomew-Featherstonehaugh-";

  return unit.repeat(Math.ceil(length / unit.length)).slice(0, length);
}

export const ISSUE_RECIPIENT: IssueRecipient = {
  id: toUserId("0195f0c2-0000-7000-8000-000000000001"),
  name: "山田 太郎",
  email: "yamada@example.com",
  withdrawn: false,
};

export const WITHDRAWN_RECIPIENT: IssueRecipient = {
  ...ISSUE_RECIPIENT,
  withdrawn: true,
};

export const LONG_NAME_RECIPIENT: IssueRecipient = {
  ...ISSUE_RECIPIENT,
  name: `${longText(MAX_NAME_LENGTH)} ${longText(MAX_NAME_LENGTH)}`,
  email: `${"very.long.mailbox.name".repeat(8)}@example.com`,
};

export const ISSUE_CATEGORY_OPTIONS: readonly AdminSelectOption[] = [
  { value: "5dd52d84-78eb-4a52-ba0b-2e11c95c2af2", label: "家電" },
  { value: "6ee63e95-89fc-4b63-cb1c-3f22d06d3b03", label: "雑貨" },
];

export const FILLED_ISSUE_OWN_VALUES: IssueOwnValues = {
  expiresAt: "2026-12-31T23:59",
  usableFrom: "",
  minPurchaseAmount: "50",
};

export const FILLED_ISSUE_DISCOUNT_VALUES: CouponDiscountValues = {
  kind: "flat",
  value: "5",
  maxAmount: "",
};

export const FILLED_ISSUE_SCOPE_VALUES: CouponScopeValues = {
  kind: "category",
  categoryId: "5dd52d84-78eb-4a52-ba0b-2e11c95c2af2",
  productId: "",
  productName: "",
};
