import { fn } from "storybook/test";

import { succeededActionState } from "@/model/action-state";

import type { ClaimCouponFormState } from "../form-state";

/**
 * カタログでの [claimCouponAction](../actions.ts)。
 *
 * @remarks
 * 本物は成立すると一覧を取り直し、受け取った 1 枚は取り直した一覧に現れます。カタログには取り直す
 * 先が無いので、成功を返して受け取った後の画面に留まります。
 */
export const claimCouponAction = fn(
  (): Promise<ClaimCouponFormState> => Promise.resolve(succeededActionState(undefined)),
).mockName("claimCouponAction");
