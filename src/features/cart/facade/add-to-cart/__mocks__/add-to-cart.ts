import { fn } from "storybook/test";

import { type ActionState, succeededActionState } from "@/model/action-state";

/**
 * カタログでの [addToCartAction](../add-to-cart.ts)。
 *
 * @returns 常に成功として解決する `ActionState`。
 */
export const addToCartAction = fn(
  (): Promise<ActionState<void>> => Promise.resolve(succeededActionState(undefined)),
).mockName("addToCartAction");
