import { fn } from "storybook/test";

import { succeededActionState } from "@/model/action-state";

import type { PlaceOrderFormState } from "../form-state";

/**
 * カタログでの [placeOrderAction](../actions.ts)。
 *
 * @remarks
 * 本物は成立した時点で完了画面へ送るため、成功の状態は画面に現れません。カタログには送り先が
 * 無いので、成功を返して押した後の画面に留まります。
 */
export const placeOrderAction = fn(
  async (): Promise<PlaceOrderFormState> => succeededActionState(undefined),
).mockName("placeOrderAction");
